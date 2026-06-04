import "server-only";

import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";
import { reviewSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";

export const REVIEW_PAGE_SIZE = 10;

export type PendingReviewProduct = {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  orderId: string;
  orderNumber: string;
  deliveredAt: Date;
};

export async function hasDeliveredProduct(
  userId: string,
  productId: string,
): Promise<boolean> {
  const hit = await db.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: "DELIVERED" },
    },
    select: { id: true },
  });
  return !!hit;
}

export async function listUnreviewedDeliveredProducts(
  userId: string,
): Promise<PendingReviewProduct[]> {
  const orders = await db.order.findMany({
    where: { userId, status: "DELIVERED" },
    orderBy: { deliveredAt: "desc" },
    select: {
      id: true,
      number: true,
      deliveredAt: true,
      items: {
        select: {
          productId: true,
          product: { select: { slug: true, name: true, images: true } },
        },
      },
    },
    take: 20,
  });

  const reviewed = new Set(
    (
      await db.review.findMany({
        where: { userId },
        select: { productId: true },
      })
    ).map((r) => r.productId),
  );

  const seen = new Set<string>();
  const pending: PendingReviewProduct[] = [];
  for (const o of orders) {
    if (!o.deliveredAt) continue;
    for (const item of o.items) {
      if (reviewed.has(item.productId) || seen.has(item.productId)) continue;
      seen.add(item.productId);
      pending.push({
        productId: item.productId,
        productSlug: item.product.slug,
        productName: item.product.name,
        productImage: await resolveImage(item.product.images[0]),
        orderId: o.id,
        orderNumber: o.number,
        deliveredAt: o.deliveredAt,
      });
    }
  }
  return pending;
}

export type ReviewListItem = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  businessName: string;
  reviewerName: string | null;
};

export type ReviewSummary = {
  items: ReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  avg: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export async function getProductReviews(
  productId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<ReviewSummary> {
  const pageSize = opts.pageSize ?? REVIEW_PAGE_SIZE;
  const page = Math.max(1, opts.page ?? 1);

  const where = { productId, published: true } as const;
  const [items, total, all] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { name: true, business: { select: { name: true } } },
        },
      },
    }),
    db.review.count({ where }),
    db.review.findMany({ where, select: { rating: true } }),
  ]);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let sum = 0;
  for (const r of all) {
    const k = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
    distribution[k]++;
    sum += r.rating;
  }
  const avg = all.length === 0 ? 0 : sum / all.length;

  return {
    items: items.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      businessName: r.user.business?.name ?? "Verified buyer",
      reviewerName: r.user.name,
    })),
    total,
    page,
    pageSize,
    avg,
    distribution,
  };
}

export async function getProductRatingSummary(productId: string) {
  const all = await db.review.findMany({
    where: { productId, published: true },
    select: { rating: true },
  });
  if (all.length === 0) return { avg: 0, count: 0 };
  const sum = all.reduce((s, r) => s + r.rating, 0);
  return { avg: sum / all.length, count: all.length };
}

export async function upsertReview(input: {
  userId: string;
  productId: string;
  rating: number;
  body: string | null;
}) {
  const parsed = reviewSchema.safeParse({
    productId: input.productId,
    rating: input.rating,
    body: input.body ?? "",
  });
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Please check your review and try again.");
  }
  const eligible = await hasDeliveredProduct(input.userId, input.productId);
  if (!eligible) {
    throw new AppError("You can only review products you have received.");
  }
  const body = parsed.data.body && parsed.data.body.length > 0 ? parsed.data.body : null;

  return db.review.upsert({
    where: { userId_productId: { userId: input.userId, productId: input.productId } },
    update: { rating: parsed.data.rating, body },
    create: {
      userId: input.userId,
      productId: input.productId,
      rating: parsed.data.rating,
      body,
    },
  });
}

export async function getUserReviewForProduct(userId: string, productId: string) {
  return db.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { rating: true, body: true },
  });
}
