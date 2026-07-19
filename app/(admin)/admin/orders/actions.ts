"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import {
  approveOrder,
  cancelOrder,
  issueInvoice,
  markDelivered,
  markDispatched,
  markPaidByAdmin,
  regenerateInvoicePdf,
  updateOrderLogistics,
} from "@/lib/orders";
import type { FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

const issueSchema = z.object({
  distanceBandId: z.string().min(1, "Pick a distance band"),
  tripCount: z
    .union([z.coerce.number().int().min(1).max(10), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : (v as number))),
  logisticsNaira: z
    .union([z.coerce.number().nonnegative(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : (v as number))),
});
const adjustLogisticsSchema = z.object({
  logisticsNaira: z.coerce.number().nonnegative(),
});
const markPaidSchema = z.object({
  amountKobo: z.coerce.number().int().nonnegative(),
  bankRef: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});
const dispatchSchema = z.object({
  courierNote: z.string().max(500).optional().or(z.literal("")),
});
const cancelSchema = z.object({
  reason: z.string().min(3, "Reason is required").max(500),
});

function revalidate(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

export async function issueInvoiceAction(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const s = await requireAdmin();
  const parsed = issueSchema.safeParse({
    distanceBandId: formData.get("distanceBandId"),
    tripCount: formData.get("tripCount") ?? "",
    logisticsNaira: formData.get("logisticsNaira") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await issueInvoice(s.user.id, orderId, {
      distanceBandId: parsed.data.distanceBandId,
      tripCountOverride: parsed.data.tripCount,
      logisticsKoboOverride:
        parsed.data.logisticsNaira != null
          ? Math.round(parsed.data.logisticsNaira * 100)
          : undefined,
    });
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true, message: "Invoice issued." };
}

export async function updateLogisticsFeeAction(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const s = await requireAdmin();
  const parsed = adjustLogisticsSchema.safeParse({
    logisticsNaira: formData.get("logisticsNaira"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await updateOrderLogistics(s.user.id, orderId, {
      logisticsKobo: Math.round(parsed.data.logisticsNaira * 100),
    });
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true, message: "Logistics fee updated." };
}

export async function regenerateInvoiceAction(orderId: string): Promise<FormState> {
  const s = await requireAdmin();
  try {
    await regenerateInvoicePdf(s.user.id, orderId);
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true, message: "Invoice PDF regenerated." };
}

export async function approveOrderAction(orderId: string): Promise<FormState> {
  const s = await requireAdmin();
  try {
    await approveOrder(s.user.id, orderId);
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true };
}

export async function markPaidAction(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const s = await requireAdmin();
  const parsed = markPaidSchema.safeParse({
    amountKobo: formData.get("amountKobo"),
    bankRef: formData.get("bankRef") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await markPaidByAdmin(s.user.id, orderId, {
      amountKobo: parsed.data.amountKobo,
      bankRef: parsed.data.bankRef || null,
      notes: parsed.data.notes || null,
    });
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true };
}

export async function markDispatchedAction(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const s = await requireAdmin();
  const parsed = dispatchSchema.safeParse({ courierNote: formData.get("courierNote") ?? "" });
  if (!parsed.success) return { ok: false, message: friendlyError(parsed.error) };
  try {
    await markDispatched(s.user.id, orderId, parsed.data.courierNote || null);
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true };
}

export async function markDeliveredAction(orderId: string): Promise<FormState> {
  const s = await requireAdmin();
  try {
    await markDelivered(s.user.id, orderId);
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true };
}

export async function cancelOrderAction(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const s = await requireAdmin();
  const parsed = cancelSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await cancelOrder(s.user.id, orderId, parsed.data.reason);
  } catch (e) {
    logError("admin.orders.action", e, { orderId, userId: s.user.id });
    return { ok: false, message: friendlyError(e) };
  }
  revalidate(orderId);
  return { ok: true };
}
