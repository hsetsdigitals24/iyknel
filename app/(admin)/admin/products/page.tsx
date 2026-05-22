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

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const products = await db.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: { category: true },
    take: 100,
  });

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

      <div className="rounded-md border">
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
    </div>
  );
}
