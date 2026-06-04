import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { uploadProductImage, deleteProductImage } from "@/lib/r2";
import type { ProductRow } from "@/lib/csv";

export const productInputSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(60),
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceNaira: z.coerce
    .number({ invalid_type_error: "Enter a price" })
    .nonnegative()
    .max(10_000_000),
  weightGrams: z.coerce.number().int().nonnegative().max(50_000_000),
  unitsPerCarton: z
    .union([z.coerce.number().int().min(1).max(100_000), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : (v as number))),
  stockCartons: z.coerce.number().int().nonnegative().max(10_000_000),
  stockLoosePieces: z.coerce.number().int().nonnegative().max(10_000_000),
  categoryName: z.string().max(120).optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
  featured: z.coerce.boolean().optional().default(false),
});
export type ProductInput = z.infer<typeof productInputSchema>;

async function resolveCategoryId(name: string | undefined | null) {
  const clean = (name ?? "").trim();
  if (!clean) return null;
  const byName = await db.category.findFirst({
    where: { name: { equals: clean, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) return byName.id;
  const slug = slugify(clean);
  const bySlug = await db.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (bySlug) return bySlug.id;
  const created = await db.category.create({ data: { slug, name: clean } });
  return created.id;
}

async function uniqueSlug(name: string, ignoreId?: string) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (true) {
    const clash = await db.product.findUnique({ where: { slug } });
    if (!clash || clash.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function createProduct(input: ProductInput, images: File[]) {
  const categoryId = await resolveCategoryId(input.categoryName);
  const slug = await uniqueSlug(input.name);
  const uploaded: string[] = [];
  for (const f of images) {
    if (f.size > 0) uploaded.push(await uploadProductImage(f));
  }
  const initialCartons = input.stockCartons;
  const initialPieces = input.stockLoosePieces;
  return db.product.create({
    data: {
      sku: input.sku,
      slug,
      name: input.name,
      description: input.description || null,
      priceKobo: Math.round(input.priceNaira * 100),
      weightGrams: input.weightGrams,
      unitsPerCarton: input.unitsPerCarton,
      stockCartons: initialCartons,
      stockLoosePieces: initialPieces,
      images: uploaded,
      active: input.active,
      featured: input.featured,
      categoryId,
      movements:
        initialCartons > 0 || initialPieces > 0
          ? {
              create: {
                deltaCartons: initialCartons,
                deltaPieces: initialPieces,
                reason: "RESTOCK",
                note: "Initial stock",
              },
            }
          : undefined,
    },
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  newImages: File[],
  removeUrls: string[],
) {
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) throw new Error("Product not found");
  const categoryId = await resolveCategoryId(input.categoryName);
  const slug =
    existing.name === input.name ? existing.slug : await uniqueSlug(input.name, existing.id);

  const cartonsDelta = input.stockCartons - existing.stockCartons;
  const piecesDelta = input.stockLoosePieces - existing.stockLoosePieces;

  const kept = existing.images.filter((u) => !removeUrls.includes(u));
  for (const u of removeUrls) {
    try {
      await deleteProductImage(u);
    } catch (e) {
      console.warn("R2 delete failed (continuing):", e);
    }
  }
  const uploaded: string[] = [];
  for (const f of newImages) {
    if (f.size > 0) uploaded.push(await uploadProductImage(f));
  }

  return db.product.update({
    where: { id },
    data: {
      sku: input.sku,
      slug,
      name: input.name,
      description: input.description || null,
      priceKobo: Math.round(input.priceNaira * 100),
      weightGrams: input.weightGrams,
      unitsPerCarton: input.unitsPerCarton,
      stockCartons: input.stockCartons,
      stockLoosePieces: input.stockLoosePieces,
      images: [...kept, ...uploaded],
      active: input.active,
      featured: input.featured,
      categoryId,
      movements:
        cartonsDelta !== 0 || piecesDelta !== 0
          ? {
              create: {
                deltaCartons: cartonsDelta,
                deltaPieces: piecesDelta,
                reason: "ADJUSTMENT",
                note: "Manual adjustment",
              },
            }
          : undefined,
    },
  });
}

export async function bulkUpsertProducts(rows: ProductRow[]) {
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const categoryId = await resolveCategoryId(row.category);
    const priceKobo = Math.round(row.price_naira * 100);
    const existing = await db.product.findUnique({ where: { sku: row.sku } });

    const cartonsDelta = row.cartons_delta;
    const piecesDelta = row.pieces_delta;
    const upc = row.units_per_carton ?? null;

    if (existing) {
      await db.$transaction([
        db.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            description: row.description || null,
            priceKobo,
            weightGrams: row.weight_grams,
            unitsPerCarton: upc,
            stockCartons: existing.stockCartons + cartonsDelta,
            stockLoosePieces: existing.stockLoosePieces + piecesDelta,
            categoryId,
          },
        }),
        ...(cartonsDelta !== 0 || piecesDelta !== 0
          ? [
              db.stockMovement.create({
                data: {
                  productId: existing.id,
                  deltaCartons: cartonsDelta,
                  deltaPieces: piecesDelta,
                  reason: "BULK_UPLOAD",
                  note: `CSV upsert`,
                },
              }),
            ]
          : []),
      ]);
      updated += 1;
    } else {
      const slug = await uniqueSlug(row.name);
      const product = await db.product.create({
        data: {
          sku: row.sku,
          slug,
          name: row.name,
          description: row.description || null,
          priceKobo,
          weightGrams: row.weight_grams,
          unitsPerCarton: upc,
          stockCartons: cartonsDelta,
          stockLoosePieces: piecesDelta,
          categoryId,
          movements:
            cartonsDelta > 0 || piecesDelta > 0
              ? {
                  create: {
                    deltaCartons: cartonsDelta,
                    deltaPieces: piecesDelta,
                    reason: "BULK_UPLOAD",
                    note: "CSV initial stock",
                  },
                }
              : undefined,
        },
      });
      created += 1;
      void product;
    }
  }

  return { created, updated };
}

export async function deleteProduct(id: string) {
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return;

  const orderItemCount = await db.orderItem.count({ where: { productId: id } });
  if (orderItemCount > 0) {
    throw new Error(
      `Product is referenced by ${orderItemCount} order item${orderItemCount === 1 ? "" : "s"}. Deactivate it instead (uncheck "Visible in catalog").`,
    );
  }

  await db.$transaction([
    db.stockMovement.deleteMany({ where: { productId: id } }),
    db.cartItem.deleteMany({ where: { productId: id } }),
    db.wishlistItem.deleteMany({ where: { productId: id } }),
    db.product.delete({ where: { id } }),
  ]);

  for (const u of existing.images) {
    try {
      await deleteProductImage(u);
    } catch (e) {
      console.warn("R2 delete failed (continuing):", e);
    }
  }
}
