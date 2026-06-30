"use server";

import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { changePasswordSchema, type FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  try {
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user?.passwordHash) {
      return { ok: false, message: "No password is set on this account." };
    }

    const valid = await compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return { ok: false, message: "Current password is incorrect." };
    }

    const passwordHash = await hash(parsed.data.newPassword, 10);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  } catch (e) {
    logError("admin.change-password", e);
    return { ok: false, message: friendlyError(e) };
  }

  return { ok: true, message: "Password updated." };
}
