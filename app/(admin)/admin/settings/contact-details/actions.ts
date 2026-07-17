"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { contactDetailsSchema, type FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

export async function updateContactDetailsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = contactDetailsSchema.safeParse({
    contactEmail: formData.get("contactEmail"),
    contactPhones: formData.get("contactPhones"),
    contactAddressLine1: formData.get("contactAddressLine1"),
    contactAddressLine2: formData.get("contactAddressLine2"),
    contactAddressLga: formData.get("contactAddressLga"),
    contactAddressState: formData.get("contactAddressState"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  const {
    contactEmail,
    contactPhones,
    contactAddressLine1,
    contactAddressLine2,
    contactAddressLga,
    contactAddressState,
  } = parsed.data;

  const values = {
    contactEmail,
    contactPhones,
    contactAddressLine1,
    contactAddressLine2,
    contactAddressLga,
    contactAddressState,
  };

  try {
    await db.siteSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...values },
      update: values,
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "settings.contact_details.updated",
        detail: { contactEmail },
      },
    });
  } catch (e) {
    logError("admin.settings.contact_details.update", e);
    return { ok: false, message: friendlyError(e) };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/contact");
  revalidatePath("/about");
  revalidatePath("/");
  return { ok: true, message: "Contact details updated." };
}
