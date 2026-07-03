import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="container py-8">
      <Skeleton className="mb-6 h-4 w-64" />
      <div className="grid gap-10 rounded-2xl border bg-card p-6 md:p-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex flex-col gap-5">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="mt-auto h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
