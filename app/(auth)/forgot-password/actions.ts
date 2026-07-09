"use server";

import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";
import { forgotSchema, type FormState } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { friendlyError, logError } from "@/lib/errors";

const CODE_TTL_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase();
  const rl = rateLimit(`forgot:${email}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterMs / 60_000);
    return {
      ok: false,
      message: `Too many requests. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  try {
    const user = await db.user.findFirst({ where: { email } });
    // Always proceed to the next page so attackers can't enumerate registered emails.
    if (user) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const codeHash = await hash(code, 10);
      await db.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash,
          channel: "email",
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });
      await sendPasswordResetEmail(user.email, code, user.name);
    }
  } catch (e) {
    logError("auth.forgot", e);
    return { ok: false, message: friendlyError(e) };
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}
