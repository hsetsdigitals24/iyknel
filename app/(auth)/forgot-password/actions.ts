"use server";

import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { sendPasswordResetSms } from "@/lib/sms";
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
  const parsed = forgotSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  const rl = rateLimit(`forgot:${parsed.data.phone}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterMs / 60_000);
    return {
      ok: false,
      message: `Too many requests. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  try {
    const user = await db.user.findFirst({ where: { phone: parsed.data.phone } });
    // Always proceed to the next page so attackers can't enumerate registered phones.
    if (user) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const codeHash = await hash(code, 10);
      await db.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash,
          channel: "sms",
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });
      await sendPasswordResetSms(parsed.data.phone, code);
    }
  } catch (e) {
    logError("auth.forgot", e);
    return { ok: false, message: friendlyError(e) };
  }

  redirect(`/reset-password?phone=${encodeURIComponent(parsed.data.phone)}`);
}
