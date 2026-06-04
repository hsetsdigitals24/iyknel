"use server";

import { z } from "zod";

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

  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    return {
      status: "error",
      message: "Quote email is not configured. Please try again later.",
    };
  }

  const { businessName, contactName, email, phone, message } = parsed.data;
  try {
    await sendMail({
      to,
      subject: `Quote request from ${businessName}`,
      text: [
        `Business: ${businessName}`,
        `Contact: ${contactName}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        "",
        message,
      ].join("\n"),
    });
  } catch (e) {
    logError("quote.submit", e);
    return { status: "error", message: friendlyError(e) };
  }

  return {
    status: "ok",
    message: "Thanks — we'll get back within one business day.",
  };
}
