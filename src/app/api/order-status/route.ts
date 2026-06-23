import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polled by /success while waiting for the webhook to land.
 *
 * Important: the Order row is created BY the webhook, not at
 * checkout, so the polling race goes:
 *
 *   t0  customer redirected to /success (Stripe URL hop)
 *   t1  Stripe POSTs the webhook (usually 1–3s after t0)
 *   t2  webhook creates the Order row
 *   t3  webhook finishes fulfillment, sets FULFILLED
 *
 * Between t0 and t2 the row genuinely doesn't exist, which is
 * "still processing" — NOT an error. We return 200 with
 * status:"PROCESSING" so the client keeps polling without
 * panicking.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing session_id" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { stripeSessionId: sessionId },
    select: {
      status:         true,
      username:       true,
      tikfinityEmail: true,
      durationDays:   true,
      priceTHBSatang: true,
      oldExpireAt:    true,
      newExpireAt:    true,
      fulfilledAt:    true,
    },
  });

  if (!order) {
    return NextResponse.json({ ok: true, processing: true });
  }

  return NextResponse.json({
    ok:    true,
    order: {
      ...order,
      oldExpireAt: order.oldExpireAt?.toISOString() ?? null,
      newExpireAt: order.newExpireAt?.toISOString() ?? null,
      fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
    },
  });
}
