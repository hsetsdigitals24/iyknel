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
  OrderSubmissionError,
} from "@/lib/orders";
import type { FormState } from "@/lib/validation";

const issueSchema = z.object({
  distanceBandId: z.string().min(1, "Pick a distance band"),
  tripCount: z
    .union([z.coerce.number().int().min(1).max(10), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : (v as number))),
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
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Pick a distance band.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await issueInvoice(s.user.id, orderId, {
      distanceBandId: parsed.data.distanceBandId,
      tripCountOverride: parsed.data.tripCount,
    });
  } catch (e) {
    if (e instanceof OrderSubmissionError) return { ok: false, message: e.message };
    throw e;
  }
  revalidate(orderId);
  return { ok: true, message: "Invoice issued." };
}

export async function approveOrderAction(orderId: string): Promise<FormState> {
  const s = await requireAdmin();
  try {
    await approveOrder(s.user.id, orderId);
  } catch (e) {
    if (e instanceof OrderSubmissionError) return { ok: false, message: e.message };
    throw e;
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
    return {
      ok: false,
      message: "Fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await markPaidByAdmin(s.user.id, orderId, {
      amountKobo: parsed.data.amountKobo,
      bankRef: parsed.data.bankRef || null,
      notes: parsed.data.notes || null,
    });
  } catch (e) {
    if (e instanceof OrderSubmissionError) return { ok: false, message: e.message };
    throw e;
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
  if (!parsed.success) return { ok: false, message: "Invalid note." };
  try {
    await markDispatched(s.user.id, orderId, parsed.data.courierNote || null);
  } catch (e) {
    if (e instanceof OrderSubmissionError) return { ok: false, message: e.message };
    throw e;
  }
  revalidate(orderId);
  return { ok: true };
}

export async function markDeliveredAction(orderId: string): Promise<FormState> {
  const s = await requireAdmin();
  try {
    await markDelivered(s.user.id, orderId);
  } catch (e) {
    if (e instanceof OrderSubmissionError) return { ok: false, message: e.message };
    throw e;
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
    return {
      ok: false,
      message: "Reason is required.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await cancelOrder(s.user.id, orderId, parsed.data.reason);
  } catch (e) {
    if (e instanceof OrderSubmissionError) return { ok: false, message: e.message };
    throw e;
  }
  revalidate(orderId);
  return { ok: true };
}
