"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";
import {
  findUserByEmail,
  setProExpire,
  calculateNewExpire,
} from "@/lib/tikfinity";

/**
 * Manual fulfillment — admin pushes the button on /admin/orders/[id]
 * when the automatic webhook failed (Tikfinity API down, mid-call
 * crash, etc). Idempotent: if the order is already FULFILLED, this
 * is a no-op.
 */
export async function manualFulfillOrder(orderId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  await requireAdmin();

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "FULFILLED") return { ok: true };
  if (order.status !== "PAID" && order.status !== "FAILED") {
    return { ok: false, error: `Cannot fulfill from status ${order.status}` };
  }

  const userResult = await findUserByEmail(order.tikfinityEmail);
  if (!userResult.ok) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        fulfillmentError:    `findUserByEmail: ${userResult.message}`,
        fulfillmentAttempts: { increment: 1 },
      },
    });
    revalidatePath(`/admin/orders/${order.id}`);
    return { ok: false, error: userResult.message };
  }

  const newExpireAt = calculateNewExpire({
    oldExpireAt:  userResult.data.proExpireAt,
    durationDays: order.durationDays,
  });

  const setResult = await setProExpire({
    channelId:   userResult.data.channelId,
    email:       order.tikfinityEmail,
    newExpireAt,
  });

  if (!setResult.ok) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        fulfillmentError:    `setProExpire: ${setResult.message}`,
        fulfillmentAttempts: { increment: 1 },
      },
    });
    revalidatePath(`/admin/orders/${order.id}`);
    return { ok: false, error: setResult.message };
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      status:           "FULFILLED",
      oldExpireAt:      userResult.data.proExpireAt,
      newExpireAt,
      fulfilledAt:      new Date(),
      fulfillmentError: null,
      fulfillmentAttempts: { increment: 1 },
    },
  });

  revalidatePath(`/admin/orders/${order.id}`);
  return { ok: true };
}
