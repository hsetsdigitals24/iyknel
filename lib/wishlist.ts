import "server-only";
import { db } from "@/lib/db";
import { addItem } from "@/lib/cart";

async function getOrCreate(userId: string) {
  return db.wishlist.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function listWishlist(userId: string) {
  const w = await getOrCreate(userId);
  return db.wishlistItem.findMany({
    where: { wishlistId: w.id },
    include: { product: true },
    orderBy: { addedAt: "desc" },
  });
}

export async function getWishlistProductIds(userId: string): Promise<Set<string>> {
  const w = await db.wishlist.findUnique({
    where: { userId },
    select: { items: { select: { productId: true } } },
  });
  return new Set((w?.items ?? []).map((i) => i.productId));
}

export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  const w = await db.wishlist.findUnique({ where: { userId }, select: { id: true } });
  if (!w) return false;
  const hit = await db.wishlistItem.findUnique({
    where: { wishlistId_productId: { wishlistId: w.id, productId } },
    select: { id: true },
  });
  return !!hit;
}

export async function addToWishlist(userId: string, productId: string) {
  const w = await getOrCreate(userId);
  await db.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: w.id, productId } },
    update: {},
    create: { wishlistId: w.id, productId },
  });
}

export async function removeFromWishlist(userId: string, productId: string) {
  const w = await getOrCreate(userId);
  await db.wishlistItem.deleteMany({ where: { wishlistId: w.id, productId } });
}

export async function moveToCart(userId: string, productId: string) {
  await addItem(userId, productId, { cartons: 0, packs: 1 });
  await removeFromWishlist(userId, productId);
}
