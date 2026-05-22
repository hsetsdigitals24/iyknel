"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, type FormState } from "@/lib/validation";

export async function registerBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    rcNumber: formData.get("rcNumber") ?? "",
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const passwordHash = await hash(parsed.data.password, 10);
  await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.contactName,
      phone: parsed.data.phone,
      passwordHash,
      role: "CUSTOMER",
      business: {
        create: {
          name: parsed.data.businessName,
          rcNumber: parsed.data.rcNumber || null,
          contactName: parsed.data.contactName,
          phone: parsed.data.phone,
        },
      },
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });

  redirect("/login?registered=1");
}
