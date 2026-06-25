import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderStatusPill } from "@/components/order-status-pill";
import { ClickableRow } from "@/components/clickable-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES: OrderStatus[] = [
  "SUBMITTED",
  "AWAITING_APPROVAL",
  "AWAITING_PAYMENT",
  "PAYMENT_REVIEW",
  "PAID",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
];

const PAGE_SIZE = 50;

function buildHref(status: string | undefined, q: string, page: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const status = (searchParams.status as OrderStatus | undefined) ?? undefined;
  const pageParam = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" as const } },
            { user: { business: { name: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await db.$transaction([
    db.order.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { include: { business: true } },
        distanceBand: true,
        vehicle: true,
      },
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + orders.length;

  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Orders
        </span>
        <h1 className="font-serif text-3xl">Back-office queue</h1>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Chip href="/admin/orders" active={!status} label="All" />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            href={`/admin/orders?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={status === s}
            label={s.replace(/_/g, " ").toLowerCase()}
          />
        ))}
      </nav>

      <form className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by order number or business"
          className="max-w-sm"
        />
        <Button variant="outline" type="submit">
          Search
        </Button>
        {(q || status) && (
          <Button asChild variant="ghost">
            <Link href="/admin/orders">Clear</Link>
          </Button>
        )}
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Logistics</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No matching orders.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <ClickableRow key={o.id} href={`/admin/orders/${o.id}`}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium hover:underline"
                    >
                      {o.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.user.business?.name ?? o.user.email}
                  </TableCell>
                  <TableCell>
                    <OrderStatusPill status={o.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.distanceBand && o.vehicle
                      ? `${o.vehicle.name} · ${o.distanceBand.label}${
                          o.tripCount > 1 ? ` · ${o.tripCount} trips` : ""
                        }`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNaira(o.totalKobo || o.subtotalKobo)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.submittedAt.toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
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
              <Link href={buildHref(status, q, page - 1)}>Previous</Link>
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
              <Link href={buildHref(status, q, page + 1)}>Next</Link>
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
