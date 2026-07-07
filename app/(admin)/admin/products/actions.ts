"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { productInputSchema } from "@/lib/products";
import { createProduct, updateProduct, deleteProduct } from "@/lib/products";
import type { FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

function parseInput(formData: FormData) {
  return productInputSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    priceNaira: formData.get("priceNaira"),
    weightGrams: formData.get("weightGrams"),
    unitsPerCarton: formData.get("unitsPerCarton") ?? "",
    stockCartons: formData.get("stockCartons") ?? 0,
    stockLoosePacks: formData.get("stockLoosePacks") ?? 0,
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
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await createProduct(parsed.data, collectFiles(formData, "images"));
  } catch (e) {
    logError("admin.products.create", e, { sku: parsed.data.sku });
    return { ok: false, message: friendlyError(e) };
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
    return { ok: false, message: friendlyError(parsed.error) };
  }
  const removeUrls = formData.getAll("removeImages").map(String).filter(Boolean);
  try {
    await updateProduct(id, parsed.data, collectFiles(formData, "images"), removeUrls);
  } catch (e) {
    logError("admin.products.update", e, { productId: id });
    return { ok: false, message: friendlyError(e) };
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
