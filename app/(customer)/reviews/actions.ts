"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireCustomer } from "@/lib/session";
import { upsertReview } from "@/lib/reviews";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; message: string };

const DISMISS_COOKIE = "iyknel_review_dismissed";
const DISMISS_DAYS = 30;

function readDismissed(): Set<string> {
  const raw = cookies().get(DISMISS_COOKIE)?.value;
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  cookies().set(DISMISS_COOKIE, JSON.stringify(Array.from(ids)), {
    httpOnly: false,
    sameSite: "lax",
    maxAge: DISMISS_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export function getDismissedProductIds(): Set<string> {
  return readDismissed();
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
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
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
  const current = readDismissed();
  for (const id of productIds) current.add(id);
  writeDismissed(current);
  return { ok: true };
}
