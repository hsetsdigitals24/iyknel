"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { requireAdmin } from "@/lib/session";
import { AppError, friendlyError, logError } from "@/lib/errors";
import type { FormState } from "@/lib/validation";

const replySchema = z.object({
  subject: z.string().trim().min(2, "Subject is required.").max(160),
  body: z.string().trim().min(10, "Write at least a short reply.").max(5000),
});

const closeSchema = z.object({
  reason: z.string().trim().min(2, "Tell us why this quote is closed.").max(500),
});

function bump(id: string) {
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${id}`);
  revalidatePath("/admin");
}

export async function sendQuoteReplyAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();
  const parsed = replySchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    const quote = await db.quoteRequest.findUnique({ where: { id } });
    if (!quote) throw new AppError("We couldn't find that quote — it may have been removed.");

    const bcc = process.env.ADMIN_NOTIFY_EMAIL || undefined;
    const replyTo = process.env.CONTACT_EMAIL || undefined;

    await sendMail({
      to: quote.email,
      bcc,
      replyTo,
      subject: parsed.data.subject,
      text: parsed.data.body,
    });

    await db.quoteRequest.update({
      where: { id },
      data: {
        status: "RESPONDED",
        responseBody: parsed.data.body,
        respondedAt: new Date(),
        respondedById: session.user.id,
      },
    });
  } catch (e) {
    logError("admin.quotes.reply", e);
    return { ok: false, message: friendlyError(e) };
  }
  bump(id);
  return { ok: true, message: "Reply sent." };
}

export async function closeQuoteAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = closeSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await db.quoteRequest.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedReason: parsed.data.reason,
      },
    });
  } catch (e) {
    logError("admin.quotes.close", e);
    return { ok: false, message: friendlyError(e) };
  }
  bump(id);
  return { ok: true, message: "Quote closed." };
}

export async function reopenQuoteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.quoteRequest.update({
    where: { id },
    data: {
      status: "PENDING",
      closedAt: null,
      closedReason: null,
    },
  });
  bump(id);
}
