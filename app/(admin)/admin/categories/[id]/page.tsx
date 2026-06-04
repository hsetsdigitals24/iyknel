import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";
import { CategoryForm, type CategoryFormData } from "../category-form";
import { updateCategoryAction } from "../actions";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const cat = await db.category.findUnique({ where: { id: params.id } });
  if (!cat) notFound();

  const imageUrl = await resolveImage(cat.image);
  const initial: CategoryFormData = {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? "",
    sortOrder: cat.sortOrder,
    active: cat.active,
    image: cat.image,
    imageUrl,
  };

  const boundAction = updateCategoryAction.bind(null, cat.id);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to categories
        </Link>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Catalog
          </span>
          <h1 className="font-serif text-3xl">{cat.name}</h1>
        </div>
      </header>
      <CategoryForm mode="edit" initial={initial} action={boundAction} />
    </div>
  );
}
