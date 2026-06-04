"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCustomer } from "@/lib/session";
import {
  cancelOrderByCustomer,
  editOrder,
  markPaidByCustomer,
  type EditOrderInput,
} from "@/lib/orders";
import { friendlyError, logError } from "@/lib/errors";

type Result = { ok: true } | { ok: false; message: string };

export async function markPaidAction(orderId: string): Promise<Result> {
  const s = await requireCustomer();
  try {
    await markPaidByCustomer(s.user.id, orderId);
  } catch (e) {
    logError("orders.customerAction", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}

const editSchema = z.object({
  addressId: z.string().min(1, "Pick a delivery address."),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        cartons: z.coerce.number().int().min(0).max(10_000),
        pieces: z.coerce.number().int().min(0).max(10_000),
      }),
    )
    .min(1),
});

export async function editOrderAction(orderId: string, input: EditOrderInput): Promise<Result> {
  const s = await requireCustomer();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await editOrder(s.user.id, orderId, {
      items: parsed.data.items,
      addressId: parsed.data.addressId,
      notes: parsed.data.notes ?? null,
    });
  } catch (e) {
    logError("orders.customerAction", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}

const cancelSchema = z.object({ reason: z.string().min(2, "Tell us why.").max(500) });

export async function cancelOrderByCustomerAction(
  orderId: string,
  reason: string,
): Promise<Result> {
  const s = await requireCustomer();
  const parsed = cancelSchema.safeParse({ reason });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Reason required." };
  }
  try {
    await cancelOrderByCustomer(s.user.id, orderId, parsed.data.reason);
  } catch (e) {
    logError("orders.customerAction", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { ok: true };
}
