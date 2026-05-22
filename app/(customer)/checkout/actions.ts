"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomer } from "@/lib/session";
import { db } from "@/lib/db";
import { submitOrder, OrderSubmissionError } from "@/lib/orders";
import type { FormState } from "@/lib/validation";

const newAddressSchema = z.object({
  line1: z.string().min(2).max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
});

export async function submitOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const s = await requireCustomer();
  const mode = formData.get("addressMode");
  const notes = (formData.get("notes") ?? "").toString().slice(0, 1000);
  let addressId: string;

  if (mode === "new") {
    const parsed = newAddressSchema.safeParse({
      line1: formData.get("line1"),
      line2: formData.get("line2") ?? "",
      city: formData.get("city"),
      state: formData.get("state"),
    });
    if (!parsed.success) {
      return {
        ok: false,
        message: "Fix the address fields below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }
    const created = await db.address.create({
      data: {
        userId: s.user.id,
        line1: parsed.data.line1,
        line2: parsed.data.line2 || null,
        city: parsed.data.city,
        state: parsed.data.state,
      },
    });
    addressId = created.id;
  } else {
    addressId = String(formData.get("addressId") ?? "");
    if (!addressId) return { ok: false, message: "Pick a delivery address." };
  }

  let order;
  try {
    order = await submitOrder(s.user.id, { addressId, notes: notes || null });
  } catch (e) {
    if (e instanceof OrderSubmissionError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/cart");
  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}
