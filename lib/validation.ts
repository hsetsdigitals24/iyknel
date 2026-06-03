import { z } from "zod";

const phoneRegex = /^\+?[0-9\s-]{7,20}$/;

export const registerSchema = z.object({
  businessName: z.string().min(2, "Business name is required").max(120),
  rcNumber: z.string().max(40).optional().or(z.literal("")),
  contactName: z.string().min(2, "Contact name is required").max(120),
  email: z.string().email("Enter a valid email"),
  phone: z.string().regex(phoneRegex, "Enter a valid phone number"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  consent: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms and Privacy Policy." }),
    }),
  ),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotSchema = z.object({
  phone: z.string().regex(phoneRegex, "Enter a valid phone number"),
});

export const resetSchema = z.object({
  phone: z.string().regex(phoneRegex),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: z.string().min(8).max(72),
});

export type FormState =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;
