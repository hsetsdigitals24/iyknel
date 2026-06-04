import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { resolveImages } from "@/lib/r2";
import { ProductForm, type ProductFormData } from "../product-form";
import { updateProductAction } from "../actions";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, cats] = await Promise.all([
    db.product.findUnique({ where: { id: params.id }, include: { category: true } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const imageUrls = await resolveImages(product.images);
  const initial: ProductFormData = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description ?? "",
    priceNaira: (product.priceKobo / 100).toFixed(2),
    weightGrams: product.weightGrams,
    unitsPerCarton: product.unitsPerCarton,
    stockCartons: product.stockCartons,
    stockLoosePieces: product.stockLoosePieces,
    categoryName: product.category?.name ?? "",
    active: product.active,
    images: product.images,
    imageUrls,
  };

  const boundAction = updateProductAction.bind(null, product.id);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to products
        </Link>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Catalog
          </span>
          <h1 className="font-serif text-3xl">{product.name}</h1>
        </div>
      </header>
      <ProductForm
        mode="edit"
        initial={initial}
        categories={cats.map((c) => c.name)}
        action={boundAction}
      />
    </div>
  );
}
