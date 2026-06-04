"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { friendlyError, logError } from "@/lib/errors";

const QuoteSchema = z.object({
  businessName: z.string().trim().min(2, "Tell us your business name."),
  contactName: z.string().trim().min(2, "Tell us who to contact."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  message: z.string().trim().min(10, "Add a few details about what you need."),
});

export type QuoteState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof QuoteSchema>, string>>;
};

export async function submitQuote(
  _prev: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  const parsed = QuoteSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { status: "error", message: friendlyError(parsed.error) };
  }

  const { businessName, contactName, email, phone, message } = parsed.data;

  let quote;
  try {
    quote = await db.quoteRequest.create({
      data: { businessName, contactName, email, phone, message },
    });
  } catch (e) {
    logError("quote.persist", e);
    return { status: "error", message: friendlyError(e) };
  }

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (adminEmail) {
    const base = process.env.NEXTAUTH_URL ?? "";
    const reviewUrl = `${base}/admin/quotes/${quote.id}`;
    try {
      await sendMail({
        to: adminEmail,
        subject: `Quote request from ${businessName}`,
        text: [
          `Business: ${businessName}`,
          `Contact: ${contactName}`,
          `Email: ${email}`,
          `Phone: ${phone}`,
          "",
          message,
          "",
          `Review & reply: ${reviewUrl}`,
        ].join("\n"),
      });
    } catch (e) {
      // Email failed but the record exists — admin can still see it in /admin/quotes.
      logError("quote.notifyAdmin", e);
    }
  }

  return {
    status: "ok",
    message: "Thanks — we'll get back within one business day.",
  };
}
