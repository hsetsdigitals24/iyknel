"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import {
  addToWishlist,
  isInWishlist,
  moveToCart,
  removeFromWishlist,
} from "@/lib/wishlist";

type Result = { ok: true } | { ok: false; message: string };
type ToggleResult =
  | { ok: true; inWishlist: boolean }
  | { ok: false; message: string };

export async function toggleWishlistAction(productId: string): Promise<ToggleResult> {
  const s = await requireCustomer();
  const had = await isInWishlist(s.user.id, productId);
  if (had) {
    await removeFromWishlist(s.user.id, productId);
  } else {
    await addToWishlist(s.user.id, productId);
  }
  revalidatePath("/wishlist");
  return { ok: true, inWishlist: !had };
}

export async function addToWishlistAction(productId: string): Promise<Result> {
  const s = await requireCustomer();
  await addToWishlist(s.user.id, productId);
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function removeFromWishlistAction(productId: string): Promise<Result> {
  const s = await requireCustomer();
  await removeFromWishlist(s.user.id, productId);
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function moveToCartAction(productId: string): Promise<Result> {
  const s = await requireCustomer();
  try {
    await moveToCart(s.user.id, productId);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
  revalidatePath("/wishlist");
  revalidatePath("/cart");
  return { ok: true };
}
