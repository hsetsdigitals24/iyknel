"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCustomer } from "@/lib/session";
import { addItem, removeItem, updateItemQty, type Qty } from "@/lib/cart";

type Result = { ok: true } | { ok: false; message: string };

const qtySchema = z
  .object({
    cartons: z.coerce.number().int().min(0).max(10_000),
    pieces: z.coerce.number().int().min(0).max(10_000),
  })
  .refine((v) => v.cartons + v.pieces > 0, {
    message: "Pick at least one carton or piece.",
  });

export async function addToCartAction(productId: string, qty: Qty): Promise<Result> {
  const s = await requireCustomer();
  const parsed = qtySchema.safeParse(qty);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid quantity." };
  }
  try {
    await addItem(s.user.id, productId, parsed.data);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to add" };
  }
  revalidatePath("/cart");
  revalidatePath("/products");
  return { ok: true };
}

export async function updateQtyAction(itemId: string, qty: Qty): Promise<Result> {
  const s = await requireCustomer();
  // Allow {0, 0} which deletes the line.
  const parsed = z
    .object({
      cartons: z.coerce.number().int().min(0).max(10_000),
      pieces: z.coerce.number().int().min(0).max(10_000),
    })
    .safeParse(qty);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid quantity." };
  }
  try {
    await updateItemQty(s.user.id, itemId, parsed.data);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to update" };
  }
  revalidatePath("/cart");
  return { ok: true };
}

export async function removeItemAction(itemId: string): Promise<Result> {
  const s = await requireCustomer();
  await removeItem(s.user.id, itemId);
  revalidatePath("/cart");
  return { ok: true };
}
