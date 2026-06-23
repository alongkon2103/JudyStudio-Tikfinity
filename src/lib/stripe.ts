import Stripe from "stripe";
import { env } from "./env";

/**
 * Server-only Stripe client.
 *
 * apiVersion is pinned so Stripe doesn't silently roll our account to a
 * newer schema with subtly different response shapes.
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});

/** Metadata attached to every Stripe Checkout Session. The webhook
 *  reads this to *create* the Order row — no DB row exists until
 *  payment lands, so the only durable carrier of the customer's
 *  intent between checkout and webhook is Stripe metadata itself.
 *
 *  All values are strings (Stripe metadata constraint). The webhook
 *  parses durationDays / priceTHBSatang back to numbers. */
export type CheckoutMetadata = {
  tikfinityEmail: string;
  channelId:      string;
  username:       string;
  durationDays:   string;
  /// BASE price in satang (excludes payment-method fee).
  priceTHBSatang: string;
  /// Payment method id — "card" | "promptpay". Same vocabulary as
  /// PaymentMethod.id and Stripe's payment_method_types.
  paymentMethod:  string;
  /// Surcharge in satang. The webhook stores this on the Order so
  /// admin can audit base vs. fee for any historical purchase.
  feeSatang:      string;
};

/**
 * Compute the surcharge for a given base price + fee in bps.
 * Pure integer math — basis points avoid the Decimal.js dance and
 * round-half-to-even bites that floats bring at API boundaries.
 *
 * Math: feeSatang = floor(base * feeBps / 10000)
 * Example: 150.00 THB (15_000 satang) with 600 bps (6%)
 *        = 15_000 * 600 / 10000 = 900 satang = 9.00 THB
 */
export function computeFeeSatang(baseSatang: number, feeBps: number): number {
  if (!Number.isFinite(baseSatang) || baseSatang <= 0) return 0;
  if (!Number.isFinite(feeBps)     || feeBps     <= 0) return 0;
  return Math.floor((baseSatang * feeBps) / 10_000);
}

/** Stripe accepts a small set of method ids. We mirror the two we
 *  expose to customers. */
export type StripePaymentMethod = "card" | "promptpay";

export function isStripePaymentMethod(v: string): v is StripePaymentMethod {
  return v === "card" || v === "promptpay";
}
