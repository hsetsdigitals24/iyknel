import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <div className="container grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="mb-4 h-5 w-24" />
          <Skeleton className="mb-5 h-9 w-full" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        </div>
      </aside>
      <div>
        <Skeleton className="mb-4 h-12 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <Skeleton className="mt-3 h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
