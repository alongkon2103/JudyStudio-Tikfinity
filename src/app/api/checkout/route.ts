import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  stripe,
  computeFeeSatang,
  isStripePaymentMethod,
  type CheckoutMetadata,
  type StripePaymentMethod,
} from "@/lib/stripe";
import { env } from "@/lib/env";
import { findUserByEmail } from "@/lib/tikfinity";
import { clientIp, hit, retryAfterSeconds } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Schema = z.object({
  email:         z.string().email().toLowerCase().trim(),
  variantId:     z.string().min(1).max(64),
  paymentMethod: z.enum(["card", "promptpay"]),
});

// 10 checkout sessions / 10 min per IP. Each session triggers a
// Stripe API call; without this an attacker could burn through our
// Stripe quota. No DB row is created here so there's nothing to
// pollute on our side — only Stripe sessions to throttle.
const IP_LIMIT     = 10;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const bucket = hit(`checkout:ip:${ip}`, { limit: IP_LIMIT, windowMs: IP_WINDOW_MS });
  if (!bucket.ok) {
    const retryAfter = retryAfterSeconds(bucket.resetIn);
    return NextResponse.json(
      { ok: false, error: "สร้างคำสั่งซื้อบ่อยเกินไป กรุณารอสักครู่" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "ข้อมูลไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  // Server-side re-verification: never trust client. Re-fetch user
  // from Tikfinity + load the variant fresh from DB (price might
  // have changed since the page loaded). The Tikfinity check also
  // catches the case where the customer mistyped the email so
  // they don't waste money paying for a non-existent account.
  // Re-resolve the payment method's fee server-side too — admin
  // might've bumped the fee % between page load and checkout.
  const [userResult, variant, method] = await Promise.all([
    findUserByEmail(parsed.data.email),
    db.variant.findUnique({ where: { id: parsed.data.variantId } }),
    db.paymentMethod.findUnique({ where: { id: parsed.data.paymentMethod } }),
  ]);

  if (!userResult.ok) {
    return NextResponse.json(
      { ok: false, error: "ไม่พบ email นี้ใน Tikfinity" },
      { status: 400 },
    );
  }
  if (!variant || !variant.isActive) {
    return NextResponse.json(
      { ok: false, error: "ตัวเลือกนี้ไม่พร้อมจำหน่าย" },
      { status: 400 },
    );
  }
  if (!method || !method.isActive) {
    return NextResponse.json(
      { ok: false, error: "ช่องทางชำระเงินนี้ไม่พร้อมใช้งาน" },
      { status: 400 },
    );
  }
  if (!isStripePaymentMethod(method.id)) {
    // Defensive — only "card" / "promptpay" pass through here. If
    // someone seeds an unknown id, fail closed.
    return NextResponse.json(
      { ok: false, error: "ช่องทางชำระเงินไม่รองรับ" },
      { status: 400 },
    );
  }

  const feeSatang   = computeFeeSatang(variant.priceTHBSatang, method.feeBps);
  const totalSatang = variant.priceTHBSatang + feeSatang;

  // Everything the webhook needs to fulfill goes in Stripe metadata
  // — we don't write to our DB until payment lands. Stringify the
  // numbers because Stripe metadata only stores strings.
  const metadata: CheckoutMetadata = {
    tikfinityEmail: parsed.data.email,
    channelId:      String(userResult.data.channelId),
    username:       userResult.data.username,
    durationDays:   String(variant.durationDays),
    priceTHBSatang: String(variant.priceTHBSatang),
    paymentMethod:  method.id,
    feeSatang:      String(feeSatang),
  };

  const paymentMethodTypes: StripePaymentMethod[] = [method.id];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Restrict to only the customer-selected rail — Stripe Checkout
      // would otherwise show all enabled methods on its hosted page
      // and the surcharge we just calculated wouldn't match what the
      // customer is paying through.
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: "thb",
            product_data: {
              name:        `Tikfinity Pro — ${variant.label}`,
              description: `ต่ออายุให้ ${userResult.data.username} (${parsed.data.email})`,
            },
            unit_amount: totalSatang,
          },
          quantity: 1,
        },
      ],
      customer_email:      parsed.data.email,
      metadata,
      payment_intent_data: { metadata },
      success_url:         `${env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:          `${env.SITE_URL}/cancel`,
      // Stripe stops accepting payment after this window — sessions
      // and their PaymentIntents are then garbage-collected on
      // Stripe's side. We don't track anything our side.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    if (!session.url) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถสร้างหน้า checkout ได้" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[checkout] stripe.sessions.create failed:", err);
    return NextResponse.json(
      { ok: false, error: "ไม่สามารถสร้างหน้า checkout ได้ กรุณาลองใหม่" },
      { status: 502 },
    );
  }
}
