import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CategoryForm } from "../category-form";
import { createCategoryAction } from "../actions";

export default function NewCategoryPage() {
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
          <h1 className="font-serif text-3xl">New category</h1>
        </div>
      </header>
      <CategoryForm mode="create" action={createCategoryAction} />
    </div>
  );
}
