"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toWhatsappDigits, WHATSAPP_CONTACTS_TAG } from "@/lib/contact";
import { whatsappContactSchema, type FormState } from "@/lib/validation";
import { AppError, friendlyError, logError } from "@/lib/errors";

function bump() {
  revalidatePath("/admin/settings");
  revalidateTag(WHATSAPP_CONTACTS_TAG);
}

type ParsedContact =
  | { error: string; data?: never }
  | {
      error?: never;
      data: { label: string; phone: string; sortOrder: number; active: boolean };
    };

function parseContact(formData: FormData): ParsedContact {
  const parsed = whatsappContactSchema.safeParse({
    label: formData.get("label"),
    phone: formData.get("phone"),
    sortOrder: formData.get("sortOrder") ?? 100,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: friendlyError(parsed.error) };

  const phone = toWhatsappDigits(parsed.data.phone);
  if (!phone) return { error: "Enter a valid Nigerian phone number." };

  return { data: { ...parsed.data, phone } };
}

export async function createWhatsappContactAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const result = parseContact(formData);
  if (result.error !== undefined) return { ok: false, message: result.error };

  try {
    const created = await db.whatsappContact.create({ data: result.data });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "whatsapp_contact.created",
        detail: { contactId: created.id },
      },
    });
  } catch (e) {
    logError("admin.whatsapp.create", e);
    return { ok: false, message: friendlyError(e) };
  }

  bump();
  redirect("/admin/settings");
}

export async function updateWhatsappContactAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const result = parseContact(formData);
  if (result.error !== undefined) return { ok: false, message: result.error };

  try {
    const target = await db.whatsappContact.findUnique({ where: { id } });
    if (!target) {
      throw new AppError("That WhatsApp contact no longer exists.");
    }

    await db.whatsappContact.update({ where: { id }, data: result.data });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "whatsapp_contact.updated",
        detail: { contactId: id },
      },
    });
  } catch (e) {
    logError("admin.whatsapp.update", e, { contactId: id });
    return { ok: false, message: friendlyError(e) };
  }

  bump();
  return { ok: true, message: "WhatsApp contact updated." };
}

export async function deleteWhatsappContactAction(id: string): Promise<void> {
  const session = await requireAdmin();

  try {
    const target = await db.whatsappContact.findUnique({ where: { id } });
    if (!target) {
      throw new AppError("That WhatsApp contact no longer exists.");
    }

    await db.whatsappContact.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "whatsapp_contact.deleted",
        detail: { contactId: id },
      },
    });
  } catch (e) {
    logError("admin.whatsapp.delete", e, { contactId: id });
    throw e;
  }

  bump();
  redirect("/admin/settings");
}
