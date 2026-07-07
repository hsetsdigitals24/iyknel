"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/session";
import {
  cancelOrderByCustomer,
  editOrder,
  markPaidByCustomer,
  restoreOrderToCartAndCancel,
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
        packs: z.coerce.number().int().min(0).max(10_000),
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

const newAddressSchema = z.object({
  line1: z.string().trim().min(2, "Enter address line 1.").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().trim().min(2, "Enter the state.").max(80),
  label: z.string().trim().max(40).optional().or(z.literal("")),
});

export async function addAddressAction(
  input: z.infer<typeof newAddressSchema>,
): Promise<{ ok: true; addressId: string } | { ok: false; message: string }> {
  const s = await requireCustomer();
  const parsed = newAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    const created = await db.address.create({
      data: {
        userId: s.user.id,
        line1: parsed.data.line1,
        line2: parsed.data.line2 || null,
        city: parsed.data.city,
        state: parsed.data.state,
        label: parsed.data.label || null,
      },
    });
    revalidatePath("/checkout");
    return { ok: true, addressId: created.id };
  } catch (e) {
    logError("orders.addAddress", e, { userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
}

export async function restoreOrderToCartAction(
  orderId: string,
): Promise<
  | { ok: true; restored: number; skipped: { name: string; reason: string }[] }
  | { ok: false; message: string }
> {
  const s = await requireCustomer();
  try {
    const result = await restoreOrderToCartAndCancel(s.user.id, orderId);
    revalidatePath("/cart");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, ...result };
  } catch (e) {
    logError("orders.restoreToCart", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
}

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
