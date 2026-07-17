"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { bankDetailsSchema, type FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

export async function updateBankDetailsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = bankDetailsSchema.safeParse({
    bankName: formData.get("bankName"),
    bankAccountName: formData.get("bankAccountName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  const { bankName, bankAccountName, bankAccountNumber } = parsed.data;

  try {
    await db.siteSetting.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", bankName, bankAccountName, bankAccountNumber },
      update: { bankName, bankAccountName, bankAccountNumber },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "settings.bank_details.updated",
        detail: { bankName },
      },
    });
  } catch (e) {
    logError("admin.settings.bank_details.update", e);
    return { ok: false, message: friendlyError(e) };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/contact");
  return { ok: true, message: "Bank details updated." };
}
