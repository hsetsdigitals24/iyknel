"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireCustomer } from "@/lib/session";
import { upsertReview } from "@/lib/reviews";
import { friendlyError, logError } from "@/lib/errors";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; message: string };

import { getDismissedProductIds } from "./dismissals";

const DISMISS_COOKIE = "iyknel_review_dismissed";
const DISMISS_DAYS = 30;

function writeDismissed(ids: Set<string>) {
  cookies().set(DISMISS_COOKIE, JSON.stringify(Array.from(ids)), {
    httpOnly: false,
    sameSite: "lax",
    maxAge: DISMISS_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function submitReviewAction(
  productId: string,
  productSlug: string,
  rating: number,
  body: string,
): Promise<ReviewActionResult> {
  const s = await requireCustomer();
  try {
    await upsertReview({
      userId: s.user.id,
      productId,
      rating,
      body: body || null,
    });
  } catch (e) {
    logError("reviews.submit", e, { productId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidatePath(`/products/${productSlug}`);
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  return { ok: true };
}

export async function dismissReviewPromptAction(
  productIds: string[],
): Promise<ReviewActionResult> {
  await requireCustomer();
  const current = getDismissedProductIds();
  for (const id of productIds) current.add(id);
  writeDismissed(current);
  return { ok: true };
}
