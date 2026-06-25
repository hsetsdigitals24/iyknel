import Link from "next/link";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableRow } from "@/components/clickable-row";
import { deleteProductAction } from "./actions";

const PAGE_SIZE = 50;

function buildHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `/admin/products?${s}` : "/admin/products";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const pageParam = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { sku: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [products, total] = await db.$transaction([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { category: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + products.length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Catalog
          </span>
          <h1 className="font-serif text-3xl">Products</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/products/bulk-upload">Bulk upload</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>
      </header>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or SKU" className="max-w-sm" />
        <Button variant="outline" type="submit">
          Search
        </Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {q ? "No matches." : "No products yet."}
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <ClickableRow key={p.id} href={`/admin/products/${p.id}`}>
                  <TableCell>
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    {p.images.length === 0 && (
                      <Badge variant="outline" className="ml-2 border-warning text-warning">
                        No image
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNaira(p.priceKobo)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.unitsPerCarton != null ? (
                      <span className="inline-flex flex-col items-end leading-tight">
                        <span>{p.stockCartons}c + {p.stockLoosePieces}p</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {p.stockCartons * p.unitsPerCarton + p.stockLoosePieces} pcs
                        </span>
                      </span>
                    ) : (
                      <>{p.stockLoosePieces} pcs</>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Hidden</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Delete
                      </Button>
                    </form>
                  </TableCell>
                </ClickableRow>
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
