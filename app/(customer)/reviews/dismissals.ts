import "server-only";

import { cookies } from "next/headers";

const DISMISS_COOKIE = "iyknel_review_dismissed";

export function getDismissedProductIds(): Set<string> {
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
