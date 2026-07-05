"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  adminCreateSchema,
  adminUpdateSchema,
  type FormState,
} from "@/lib/validation";
import { AppError, friendlyError, logError } from "@/lib/errors";

function bump() {
  revalidatePath("/admin/settings");
}

export async function createAdminAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = adminCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("An account with that email already exists.");
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const created = await db.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone || null,
        passwordHash,
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "admin.created",
        detail: { userId: created.id },
      },
    });
  } catch (e) {
    logError("admin.admins.create", e);
    return { ok: false, message: friendlyError(e) };
  }

  bump();
  redirect("/admin/settings");
}

export async function updateAdminAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = adminUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    newPassword: formData.get("newPassword") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  try {
    const target = await db.user.findUnique({ where: { id } });
    if (!target || target.role !== "ADMIN") {
      throw new AppError("That admin account no longer exists.");
    }

    const email = parsed.data.email.toLowerCase();
    const clash = await db.user.findUnique({ where: { email } });
    if (clash && clash.id !== id) {
      throw new AppError("An account with that email already exists.");
    }

    const passwordReset = Boolean(parsed.data.newPassword);
    await db.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone || null,
        ...(passwordReset
          ? { passwordHash: await hash(parsed.data.newPassword as string, 10) }
          : {}),
      },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "admin.updated",
        detail: { userId: id, passwordReset },
      },
    });
  } catch (e) {
    logError("admin.admins.update", e, { userId: id });
    return { ok: false, message: friendlyError(e) };
  }

  bump();
  return { ok: true, message: "Admin account updated." };
}

export async function deleteAdminAction(id: string): Promise<void> {
  const session = await requireAdmin();

  try {
    if (id === session.user.id) {
      throw new AppError("You can't delete your own account.");
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target || target.role !== "ADMIN") {
      throw new AppError("That admin account no longer exists.");
    }

    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new AppError("You can't delete the last admin account.");
    }

    await db.user.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "admin.deleted",
        detail: { userId: id },
      },
    });
  } catch (e) {
    logError("admin.admins.delete", e, { userId: id });
    throw e;
  }

  bump();
  redirect("/admin/settings");
}
