import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { ProductForm } from "../product-form";
import { createProductAction } from "../actions";

export default async function NewProductPage() {
  const cats = await db.category.findMany({ orderBy: { name: "asc" } });
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
          <h1 className="font-serif text-3xl">New product</h1>
        </div>
      </header>
      <ProductForm
        mode="create"
        categories={cats.map((c) => c.name)}
        action={createProductAction}
      />
    </div>
  );
}
