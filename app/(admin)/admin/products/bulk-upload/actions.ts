"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { parseProductFile, type ProductRowError } from "@/lib/csv";
import { bulkUpsertProducts } from "@/lib/products";
import { friendlyError, logError } from "@/lib/errors";

export type BulkUploadState =
  | null
  | { ok: true; message: string }
  | { ok: false; message: string; rowErrors?: ProductRowError[] };

export async function bulkUploadAction(
  _prev: BulkUploadState,
  formData: FormData,
): Promise<BulkUploadState> {
  await requireAdmin();
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Pick a CSV or Excel file to upload." };
  }
  const parsed = await parseProductFile(file);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message, rowErrors: parsed.errors };
  }
  let created = 0;
  let updated = 0;
  try {
    const res = await bulkUpsertProducts(parsed.rows);
    created = res.created;
    updated = res.updated;
  } catch (e) {
    logError("admin.products.bulkUpload", e);
    return { ok: false, message: friendlyError(e) };
  }
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/products");
  redirect(`/admin/products?bulk=ok&created=${created}&updated=${updated}`);
}
