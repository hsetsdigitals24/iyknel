"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, type FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";
import { notifyWelcome } from "@/lib/notifications";

export async function registerBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    businessName: formData.get("businessName"),
    rcNumber: formData.get("rcNumber") ?? "",
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }

  try {
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

    // Fire-and-forget welcome notification; never block signup on it.
    void notifyWelcome({
      email: parsed.data.email,
      phone: parsed.data.phone,
      name: parsed.data.contactName,
    }).catch((e) => logError("auth.welcomeNotify", e));
  } catch (e) {
    logError("auth.register", e);
    return { ok: false, message: friendlyError(e) };
  }

  redirect("/login?registered=1");
}
