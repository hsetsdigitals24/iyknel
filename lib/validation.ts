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

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(100),
  active: z.coerce.boolean().optional().default(true),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  body: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters")
    .optional()
    .or(z.literal("")),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const resetSchema = z.object({
  phone: z.string().regex(phoneRegex),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: z.string().min(8).max(72),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

export const adminCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(120),
    email: z.string().trim().email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Enter a valid phone number")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type AdminCreateInput = z.infer<typeof adminCreateSchema>;

export const adminUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(120),
    email: z.string().trim().email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Enter a valid phone number")
      .optional()
      .or(z.literal("")),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72)
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;

export const whatsappContactSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone number"),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(100),
  active: z.coerce.boolean().optional().default(true),
});
export type WhatsappContactInput = z.infer<typeof whatsappContactSchema>;

export type FormState =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;
