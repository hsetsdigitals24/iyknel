"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { parseProductCsv, type ProductRowError } from "@/lib/csv";
import { bulkUpsertProducts } from "@/lib/products";

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
    return { ok: false, message: "Pick a CSV file to upload." };
  }
  const parsed = await parseProductCsv(file);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message, rowErrors: parsed.errors };
  }
  const { created, updated } = await bulkUpsertProducts(parsed.rows);
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/products");
  redirect(`/admin/products?bulk=ok&created=${created}&updated=${updated}`);
}
