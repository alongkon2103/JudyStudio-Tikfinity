"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

/**
 * Convert a THB price to USD using the European Central Bank's
 * daily reference rate (via frankfurter.app — free, no API key, no
 * usage limits in practice). The USD figure we set is for display
 * only — Stripe still charges THB — so a 24-hour stale rate is fine
 * and avoids paying for a commercial FX feed.
 */
export async function fetchUsdFromTHB(thbSatang: number): Promise<
  | { ok: true; usdCents: number; rate: number; date: string }
  | { ok: false; error: string }
> {
  await requireAdmin();

  if (!Number.isFinite(thbSatang) || thbSatang <= 0) {
    return { ok: false, error: "Invalid THB amount" };
  }

  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=THB&to=USD",
      {
        signal: AbortSignal.timeout(5_000),
        cache:  "no-store",
        headers: { accept: "application/json" },
      },
    );
    if (!res.ok) {
      return { ok: false, error: `Frankfurter HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      rates?: { USD?: number };
      date?: string;
    };
    const rate = data?.rates?.USD;
    const date = data?.date;
    if (typeof rate !== "number" || typeof date !== "string") {
      return { ok: false, error: "Unexpected response shape" };
    }

    const thb = thbSatang / 100;
    const usd = thb * rate;
    return {
      ok:       true,
      usdCents: Math.round(usd * 100),
      rate,
      date,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, error: msg };
  }
}

const UpdateSchema = z.object({
  id:             z.string().min(1).max(64),
  label:          z.string().trim().min(1).max(80),
  labelEn:        z.string().trim().min(1).max(80).nullable(),
  priceTHBSatang: z.number().int().min(100).max(1_000_000_00),
  priceUSDCents:  z.number().int().min(1).max(10_000_000).nullable(),
  isActive:       z.boolean(),
});

export async function updateVariant(input: {
  id:             string;
  label:          string;
  labelEn:        string | null;
  priceTHBSatang: number;
  priceUSDCents:  number | null;
  isActive:       boolean;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  try {
    await db.variant.update({
      where: { id: parsed.data.id },
      data: {
        label:          parsed.data.label,
        labelEn:        parsed.data.labelEn,
        priceTHBSatang: parsed.data.priceTHBSatang,
        priceUSDCents:  parsed.data.priceUSDCents,
        isActive:       parsed.data.isActive,
      },
    });
  } catch (err) {
    console.error("[pricing] updateVariant failed:", err);
    return { ok: false, error: "บันทึกไม่สำเร็จ" };
  }

  revalidatePath("/admin/pricing");
  revalidatePath("/");
  return { ok: true };
}
