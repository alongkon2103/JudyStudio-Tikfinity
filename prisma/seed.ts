/**
 * Seed 4 Tikfinity Pro variants.
 *
 * Cost values mirror tikfinityth.one reseller `rates` at time of
 * seed; if Tikfinity changes them, update here AND tell admin via
 * the price page.
 *
 * Default price is a starter — admin should tune on /admin/pricing
 * before going live. Markup leaves room for Stripe's 3.65% + ฿11
 * THB-card fee.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const VARIANTS = [
  { durationDays: 3,  label: "3 วัน",            labelEn: "3 days",         costTHBSatang: 40_00,    priceTHBSatang: 59_00,    priceUSDCents: 199,  displayOrder: 1 },
  { durationDays: 7,  label: "7 วัน",            labelEn: "7 days",         costTHBSatang: 90_00,    priceTHBSatang: 129_00,   priceUSDCents: 399,  displayOrder: 2 },
  { durationDays: 30, label: "30 วัน (1 เดือน)", labelEn: "30 days (1 month)",  costTHBSatang: 360_00,   priceTHBSatang: 459_00,   priceUSDCents: 1399, displayOrder: 3 },
  { durationDays: 90, label: "90 วัน (3 เดือน)", labelEn: "90 days (3 months)", costTHBSatang: 1_000_00, priceTHBSatang: 1_290_00, priceUSDCents: 3899, displayOrder: 4 },
];

async function main() {
  for (const v of VARIANTS) {
    const row = await db.variant.upsert({
      where:  { durationDays: v.durationDays },
      update: {
        label:         v.label,
        labelEn:       v.labelEn,
        costTHBSatang: v.costTHBSatang,
        displayOrder:  v.displayOrder,
      },
      create: v,
    });
    console.log(
      `✓ ${row.durationDays}d — cost ฿${(row.costTHBSatang / 100).toFixed(2)} → ` +
      `sell ฿${(row.priceTHBSatang / 100).toFixed(2)}` +
      (row.priceUSDCents !== null ? ` / $${(row.priceUSDCents / 100).toFixed(2)}` : "") +
      ` (${row.isActive ? "active" : "inactive"})`,
    );
  }
}

const PAYMENT_METHODS = [
  { id: "promptpay", label: "PromptPay",   labelEn: "PromptPay",   feeBps: 0,   displayOrder: 1 },
  { id: "card",      label: "บัตรเครดิต / เดบิต", labelEn: "Credit / Debit Card", feeBps: 600, displayOrder: 2 },
];

async function seedPaymentMethods() {
  for (const m of PAYMENT_METHODS) {
    const row = await db.paymentMethod.upsert({
      where:  { id: m.id },
      // Only label/display/feeBps are admin-tunable; leave isActive
      // alone on re-seed so a deactivated method doesn't reappear.
      update: {
        label:        m.label,
        labelEn:      m.labelEn,
        displayOrder: m.displayOrder,
      },
      create: m,
    });
    console.log(
      `✓ ${row.id} — fee ${(row.feeBps / 100).toFixed(2)}% (${row.isActive ? "active" : "inactive"})`,
    );
  }
}

main()
  .then(() => seedPaymentMethods())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
