import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe, type CheckoutMetadata } from "@/lib/stripe";
import { env } from "@/lib/env";
import {
  findUserByEmail,
  setProExpire,
  calculateNewExpire,
} from "@/lib/tikfinity";

// Stripe must POST the raw body — Next's automatic JSON parsing
// would invalidate the signature. Force Node runtime so the
// constructEvent crypto comparison is available.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return new NextResponse(`Webhook signature failed: ${msg}`, { status: 400 });
  }

  try {
    // We react to two "session done, payment confirmed" events:
    //
    //   checkout.session.completed             — fires for sync methods
    //     (card) once payment lands. For async methods (PromptPay)
    //     this fires when the QR is shown, BEFORE money arrives,
    //     so payment_status="unpaid" — we skip in that case.
    //
    //   checkout.session.async_payment_succeeded — fires only after
    //     the bank confirms the PromptPay (or other async) payment.
    //     payment_status="paid" — safe to fulfill.
    //
    // The payment_status === "paid" guard inside onCheckoutCompleted
    // makes both branches converge correctly.
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error(`[stripe-webhook] ${event.type} handler failed:`, err);
    // Return 500 so Stripe retries — better than acking and losing
    // the fulfillment.
    return new NextResponse("Handler error", { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Guard against the PromptPay "QR shown but not paid yet" case —
  // checkout.session.completed fires there with payment_status set
  // to "unpaid". We must NOT extend Tikfinity Pro for an unpaid
  // order. The async_payment_succeeded event will re-arrive with
  // payment_status="paid" once the bank settles.
  if (session.payment_status !== "paid") {
    console.log(
      `[stripe-webhook] session ${session.id} skipped — payment_status=${session.payment_status}`,
    );
    return;
  }

  // Idempotency: a redelivered webhook must not create a duplicate
  // order OR re-fulfill an existing one. The unique stripeSessionId
  // constraint enforces this at the DB level too.
  const existing = await db.order.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existing && existing.status === "FULFILLED") return;

  const meta = parseMetadata(session.metadata);
  if (!meta) {
    console.error(`[stripe-webhook] session ${session.id} missing metadata`);
    return;
  }

  // Re-fetch the customer's current Tikfinity expiry — between
  // checkout and now they might have bought elsewhere or had admin
  // intervention. Always compute newExpireAt from fresh state, never
  // from the snapshot taken at checkout time.
  const userResult = await findUserByEmail(meta.tikfinityEmail);
  if (!userResult.ok) {
    await upsertOrder(session, meta, {
      status:           "FAILED",
      fulfillmentError: `findUserByEmail: ${userResult.message}`,
      fulfillmentAttemptsDelta: 1,
    });
    return;
  }

  const newExpireAt = calculateNewExpire({
    oldExpireAt:  userResult.data.proExpireAt,
    durationDays: meta.durationDays,
  });

  const setResult = await setProExpire({
    channelId:   userResult.data.channelId,
    email:       meta.tikfinityEmail,
    newExpireAt,
  });

  if (!setResult.ok) {
    await upsertOrder(session, meta, {
      status:           "FAILED",
      oldExpireAt:      userResult.data.proExpireAt,
      fulfillmentError: `setProExpire: ${setResult.message}`,
      fulfillmentAttemptsDelta: 1,
    });
    return;
  }

  await upsertOrder(session, meta, {
    status:           "FULFILLED",
    oldExpireAt:      userResult.data.proExpireAt,
    newExpireAt,
    fulfilledAt:      new Date(),
    fulfillmentError: null,
    fulfillmentAttemptsDelta: 1,
  });
}

// ─── Helpers ─────────────────────────────────────────────────

type ParsedMetadata = {
  tikfinityEmail: string;
  channelId:      string;
  username:       string | null;
  durationDays:   number;
  priceTHBSatang: number;
  paymentMethod:  string;
  feeSatang:      number;
};

function parseMetadata(raw: Stripe.Metadata | null): ParsedMetadata | null {
  if (!raw) return null;
  const m = raw as Partial<CheckoutMetadata>;
  if (
    typeof m.tikfinityEmail !== "string" ||
    typeof m.channelId !== "string" ||
    typeof m.durationDays !== "string" ||
    typeof m.priceTHBSatang !== "string"
  ) {
    return null;
  }
  const days  = Number.parseInt(m.durationDays,   10);
  const price = Number.parseInt(m.priceTHBSatang, 10);
  if (!Number.isFinite(days) || days <= 0)     return null;
  if (!Number.isFinite(price) || price <= 0)   return null;
  // paymentMethod + feeSatang are added by the new checkout flow but
  // we tolerate missing values so any in-flight legacy sessions
  // (created before this deploy) still complete — they get the
  // safe defaults of "promptpay" / 0 fee.
  const method = typeof m.paymentMethod === "string" ? m.paymentMethod : "promptpay";
  const fee    = typeof m.feeSatang === "string" ? Number.parseInt(m.feeSatang, 10) : 0;
  return {
    tikfinityEmail: m.tikfinityEmail,
    channelId:      m.channelId,
    username:       typeof m.username === "string" ? m.username : null,
    durationDays:   days,
    priceTHBSatang: price,
    paymentMethod:  method,
    feeSatang:      Number.isFinite(fee) && fee >= 0 ? fee : 0,
  };
}

async function upsertOrder(
  session: Stripe.Checkout.Session,
  meta:    ParsedMetadata,
  state:   {
    status:           "PAID" | "FULFILLED" | "FAILED";
    oldExpireAt?:     Date | null;
    newExpireAt?:     Date | null;
    fulfilledAt?:     Date | null;
    fulfillmentError?: string | null;
    fulfillmentAttemptsDelta: number;
  },
) {
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  await db.order.upsert({
    where: { stripeSessionId: session.id },
    create: {
      stripeSessionId:     session.id,
      stripePaymentIntent: paymentIntent,
      tikfinityEmail:      meta.tikfinityEmail,
      channelId:           meta.channelId,
      username:            meta.username,
      durationDays:        meta.durationDays,
      priceTHBSatang:      meta.priceTHBSatang,
      paymentMethod:       meta.paymentMethod,
      feeSatang:           meta.feeSatang,
      status:              state.status,
      oldExpireAt:         state.oldExpireAt ?? null,
      newExpireAt:         state.newExpireAt ?? null,
      fulfilledAt:         state.fulfilledAt ?? null,
      fulfillmentError:    state.fulfillmentError ?? null,
      fulfillmentAttempts: state.fulfillmentAttemptsDelta,
    },
    update: {
      status:              state.status,
      stripePaymentIntent: paymentIntent,
      oldExpireAt:         state.oldExpireAt ?? undefined,
      newExpireAt:         state.newExpireAt ?? undefined,
      fulfilledAt:         state.fulfilledAt ?? undefined,
      fulfillmentError:    state.fulfillmentError ?? undefined,
      fulfillmentAttempts: { increment: state.fulfillmentAttemptsDelta },
    },
  });
}
