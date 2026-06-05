import "server-only";

import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import {
  deleteProductImage as deleteR2Object,
  uploadCategoryImage,
} from "@/lib/r2";
import type { CategoryInput } from "@/lib/validation";
import { AppError, logError } from "@/lib/errors";

async function uniqueCategorySlug(name: string, ignoreId?: string): Promise<string> {
  const base = slugify(name) || "category";
  let slug = base;
  let n = 1;
  while (true) {
    const clash = await db.category.findUnique({ where: { slug } });
    if (!clash || clash.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export type CategoryListRow = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  sortOrder: number;
  active: boolean;
  productCount: number;
};

export async function listCategoriesWithCounts(
  opts: { q?: string; skip?: number; take?: number } = {},
): Promise<{ rows: CategoryListRow[]; total: number }> {
  const { q, skip, take } = opts;
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [cats, total] = await db.$transaction([
    db.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
      skip,
      take,
    }),
    db.category.count({ where }),
  ]);

  const rows = cats.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    image: c.image,
    sortOrder: c.sortOrder,
    active: c.active,
    productCount: c._count.products,
  }));
  return { rows, total };
}

export async function createCategory(input: CategoryInput, file?: File | null) {
  const explicitSlug = (input.slug ?? "").trim();
  const slug = await uniqueCategorySlug(explicitSlug || input.name);
  let imageKey: string | null = null;
  if (file && file.size > 0) {
    imageKey = await uploadCategoryImage(file);
  }
  return db.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder,
      active: input.active,
      image: imageKey,
    },
  });
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
  file?: File | null,
  removeImage?: boolean,
) {
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) throw new AppError("We couldn't find that category — it may have been removed.");

  const explicitSlug = (input.slug ?? "").trim();
  const desiredSlug =
    explicitSlug && explicitSlug !== existing.slug
      ? await uniqueCategorySlug(explicitSlug, id)
      : !explicitSlug && existing.name !== input.name
        ? await uniqueCategorySlug(input.name, id)
        : existing.slug;

  let imageKey: string | null = existing.image;
  const hasNewFile = !!(file && file.size > 0);
  if (removeImage || hasNewFile) {
    if (existing.image) {
      try {
        await deleteR2Object(existing.image);
      } catch (e) {
        logError("r2.delete", e);
      }
    }
    imageKey = null;
  }
  if (hasNewFile) {
    imageKey = await uploadCategoryImage(file!);
  }

  return db.category.update({
    where: { id },
    data: {
      name: input.name,
      slug: desiredSlug,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder,
      active: input.active,
      image: imageKey,
    },
  });
}

export async function deleteCategory(id: string) {
  const cat = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!cat) return;
  if (cat._count.products > 0) {
    throw new AppError(
      `Category has ${cat._count.products} product${cat._count.products === 1 ? "" : "s"}. Reassign or hide them first.`,
    );
  }
  if (cat.image) {
    try {
      await deleteR2Object(cat.image);
    } catch (e) {
      logError("r2.delete", e);
    }
  }
  await db.category.delete({ where: { id } });
}
