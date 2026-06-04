"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { productInputSchema } from "@/lib/products";
import { createProduct, updateProduct, deleteProduct } from "@/lib/products";
import type { FormState } from "@/lib/validation";

function parseInput(formData: FormData) {
  return productInputSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    priceNaira: formData.get("priceNaira"),
    weightGrams: formData.get("weightGrams"),
    unitsPerCarton: formData.get("unitsPerCarton") ?? "",
    stockCartons: formData.get("stockCartons") ?? 0,
    stockLoosePieces: formData.get("stockLoosePieces") ?? 0,
    categoryName: formData.get("categoryName") ?? "",
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
  });
}

function collectFiles(formData: FormData, key: string): File[] {
  return formData.getAll(key).filter((v): v is File => v instanceof File);
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await createProduct(parsed.data, collectFiles(formData, "images"));
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save." };
  }
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function updateProductAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const removeUrls = formData.getAll("removeImages").map(String).filter(Boolean);
  try {
    await updateProduct(id, parsed.data, collectFiles(formData, "images"), removeUrls);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save." };
  }
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteProduct(id);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
}
