"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { freeLogisticsSchema, type FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

export async function updateFreeLogisticsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = freeLogisticsSchema.safeParse({
    thresholdNaira: formData.get("thresholdNaira"),
    bannerText: formData.get("bannerText"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  const thresholdKobo = Math.round(parsed.data.thresholdNaira * 100);

  try {
    await db.siteSetting.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        freeLogisticsThresholdKobo: thresholdKobo,
        freeLogisticsBannerText: parsed.data.bannerText,
      },
      update: {
        freeLogisticsThresholdKobo: thresholdKobo,
        freeLogisticsBannerText: parsed.data.bannerText,
      },
    });

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "settings.free_logistics.updated",
        detail: { thresholdKobo },
      },
    });
  } catch (e) {
    logError("admin.settings.free_logistics.update", e);
    return { ok: false, message: friendlyError(e) };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/products", "layout");
  revalidatePath("/cart");
  return { ok: true, message: "Free logistics banner updated." };
}
