import Link from "next/link";
import Image from "next/image";

import { listCategoriesWithCounts } from "@/lib/categories";
import { resolveImage } from "@/lib/r2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCategoryAction } from "./actions";
import { ConfirmDeleteCategoryButton } from "./row-controls";

const PAGE_SIZE = 50;

function buildHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `/admin/categories?${s}` : "/admin/categories";
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const pageParam = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const { rows, total } = await listCategoriesWithCounts({
    q: q || undefined,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const imageUrls = await Promise.all(rows.map((r) => resolveImage(r.image)));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + rows.length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Catalog
          </span>
          <h1 className="font-serif text-3xl">Categories</h1>
        </div>
        <Button asChild>
          <Link href="/admin/categories/new">New category</Link>
        </Button>
      </header>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by name or slug"
          className="max-w-sm"
        />
        <Button variant="outline" type="submit">
          Search
        </Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]" />
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {q ? "No matches." : "No categories yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-surface-muted">
                      <Image
                        src={imageUrls[i] || "/placeholders/product.svg"}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/categories/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.slug}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.productCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.sortOrder}</TableCell>
                  <TableCell>
                    {r.active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Hidden</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/categories/${r.id}`}>Edit</Link>
                      </Button>
                      <form action={deleteCategoryAction.bind(null, r.id)}>
                        <ConfirmDeleteCategoryButton label={`Delete ${r.name}`} />
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "No results"
            : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref(q, page - 1)}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref(q, page + 1)}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
