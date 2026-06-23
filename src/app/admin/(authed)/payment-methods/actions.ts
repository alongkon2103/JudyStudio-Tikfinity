"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";

const UpdateSchema = z.object({
  id:       z.string().min(1).max(64),
  label:    z.string().trim().min(1).max(80),
  labelEn:  z.string().trim().min(1).max(80),
  // Allow 0 – 10000 bps (0% – 100%). Anything higher would be a
  // typo, and admin should never charge more than face value.
  feeBps:   z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
});

export async function updatePaymentMethod(input: {
  id:       string;
  label:    string;
  labelEn:  string;
  feeBps:   number;
  isActive: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  try {
    await db.paymentMethod.update({
      where: { id: parsed.data.id },
      data: {
        label:    parsed.data.label,
        labelEn:  parsed.data.labelEn,
        feeBps:   parsed.data.feeBps,
        isActive: parsed.data.isActive,
      },
    });
  } catch (err) {
    console.error("[payment-methods] updatePaymentMethod failed:", err);
    return { ok: false, error: "บันทึกไม่สำเร็จ" };
  }

  revalidatePath("/admin/payment-methods");
  // Public site reads this list — bust the cached homepage so a
  // newly-enabled method shows up immediately.
  revalidatePath("/");
  return { ok: true };
}
