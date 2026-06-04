"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import {
  addToWishlist,
  isInWishlist,
  moveToCart,
  removeFromWishlist,
} from "@/lib/wishlist";
import { friendlyError, logError } from "@/lib/errors";

type Result = { ok: true } | { ok: false; message: string };
type ToggleResult =
  | { ok: true; inWishlist: boolean }
  | { ok: false; message: string };

export async function toggleWishlistAction(productId: string): Promise<ToggleResult> {
  const s = await requireCustomer();
  try {
    const had = await isInWishlist(s.user.id, productId);
    if (had) {
      await removeFromWishlist(s.user.id, productId);
    } else {
      await addToWishlist(s.user.id, productId);
    }
    revalidatePath("/wishlist");
    return { ok: true, inWishlist: !had };
  } catch (e) {
    logError("wishlist.toggle", e, { productId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
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
    logError("wishlist.moveToCart", e, { productId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidatePath("/wishlist");
  revalidatePath("/cart");
  return { ok: true };
}
