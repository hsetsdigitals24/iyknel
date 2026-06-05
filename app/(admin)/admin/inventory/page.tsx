import Link from "next/link";
import type { StockReason } from "@prisma/client";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const REASONS: StockReason[] = ["RESTOCK", "BULK_UPLOAD", "ORDER", "ADJUSTMENT", "RETURN"];

const PAGE_SIZE = 50;

function buildHref(reason: string | undefined, sku: string, page: number) {
  const params = new URLSearchParams();
  if (reason) params.set("reason", reason);
  if (sku) params.set("sku", sku);
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `/admin/inventory?${s}` : "/admin/inventory";
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { sku?: string; reason?: string; page?: string };
}) {
  const sku = searchParams.sku?.trim() ?? "";
  const reason = (searchParams.reason as StockReason | undefined) ?? undefined;
  const pageParam = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const where = {
    ...(reason ? { reason } : {}),
    ...(sku
      ? { product: { sku: { contains: sku, mode: "insensitive" as const } } }
      : {}),
  };

  const [movements, total] = await db.$transaction([
    db.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { product: true, order: true },
    }),
    db.stockMovement.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + movements.length;

  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Inventory
        </span>
        <h1 className="font-serif text-3xl">Stock movements</h1>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Chip href="/admin/inventory" active={!reason} label="All" />
        {REASONS.map((r) => (
          <Chip
            key={r}
            href={`/admin/inventory?reason=${r}${sku ? `&sku=${encodeURIComponent(sku)}` : ""}`}
            active={reason === r}
            label={r.toLowerCase().replace(/_/g, " ")}
          />
        ))}
      </nav>

      <form className="flex gap-2">
        {reason && <input type="hidden" name="reason" value={reason} />}
        <Input name="sku" defaultValue={sku} placeholder="Filter by SKU" className="max-w-sm" />
        <Button variant="outline" type="submit">
          Search
        </Button>
        {(sku || reason) && (
          <Button asChild variant="ghost">
            <Link href="/admin/inventory">Clear</Link>
          </Button>
        )}
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No movements yet.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => (
                <ClickableRow key={m.id} href={`/admin/products/${m.productId}`}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {m.createdAt.toLocaleString("en-NG", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/products/${m.productId}`}
                      className="hover:underline"
                    >
                      {m.product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.product.sku}</TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      m.deltaCartons < 0 || m.deltaPieces < 0 ? "text-destructive" : ""
                    }`}
                  >
                    {formatDelta(m.deltaCartons, m.deltaPieces)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.reason.toLowerCase().replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    {m.order ? (
                      <Link
                        href={`/admin/orders/${m.orderId}`}
                        className="text-sm hover:underline"
                      >
                        {m.order.number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.note ?? "—"}
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
              <Link href={buildHref(reason, sku, page - 1)}>Previous</Link>
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
              <Link href={buildHref(reason, sku, page + 1)}>Next</Link>
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

function formatDelta(cartons: number, pieces: number): string {
  const parts: string[] = [];
  if (cartons !== 0) parts.push(`${cartons > 0 ? "+" : ""}${cartons}c`);
  if (pieces !== 0) parts.push(`${pieces > 0 ? "+" : ""}${pieces}p`);
  return parts.length === 0 ? "0" : parts.join(" / ");
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
          : "rounded-full border px-3 py-1 capitalize text-muted-foreground hover:bg-secondary hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
