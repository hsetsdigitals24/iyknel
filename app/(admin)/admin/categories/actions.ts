"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/session";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/categories";
import { categoryInputSchema, type FormState } from "@/lib/validation";
import { friendlyError, logError } from "@/lib/errors";

function parseInput(formData: FormData) {
  return categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    sortOrder: formData.get("sortOrder") ?? 100,
    active: formData.get("active") === "on",
  });
}

function fileFrom(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

function bump() {
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/products");
}

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  try {
    await createCategory(parsed.data, fileFrom(formData, "image"));
  } catch (e) {
    logError("admin.categories.create", e);
    return { ok: false, message: friendlyError(e) };
  }
  bump();
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { ok: false, message: friendlyError(parsed.error) };
  }
  const removeImage = formData.get("removeImage") === "1";
  try {
    await updateCategory(id, parsed.data, fileFrom(formData, "image"), removeImage);
  } catch (e) {
    logError("admin.categories.update", e, { categoryId: id });
    return { ok: false, message: friendlyError(e) };
  }
  bump();
  return { ok: true, message: "Category updated." };
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteCategory(id);
  bump();
}
