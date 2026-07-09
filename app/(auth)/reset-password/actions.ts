"use server";

import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { resetSchema, type FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  try {
    const user = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user) {
      return { ok: false, message: "Invalid code or email." };
    }

    const candidates = await db.passwordResetCode.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    let matched: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      if (await compare(parsed.data.code, c.codeHash)) {
        matched = c;
        break;
      }
    }
    if (!matched) {
      return { ok: false, message: "Invalid or expired code." };
    }

    const passwordHash = await hash(parsed.data.password, 10);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.passwordResetCode.update({ where: { id: matched.id }, data: { usedAt: new Date() } }),
    ]);
  } catch (e) {
    logError("auth.reset", e);
    return { ok: false, message: friendlyError(e) };
  }

  redirect("/login?reset=1");
}
