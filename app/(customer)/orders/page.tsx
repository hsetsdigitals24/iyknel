import Link from "next/link";
import { Package, Plus } from "lucide-react";

import { requireCustomer } from "@/lib/session";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { ClickableTr } from "@/components/clickable-row";

export default async function OrdersPage() {
  const session = await requireCustomer();
  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      id: true,
      number: true,
      status: true,
      totalKobo: true,
      subtotalKobo: true,
      submittedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span> / </span>
            <span className="text-foreground">Orders</span>
          </nav>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            Your orders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track invoices, payments and deliveries.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/products">
            <Plus className="mr-1.5 h-4 w-4" /> Place a new order
          </Link>
        </Button>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center">
          <Package className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your submitted orders will appear here.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <ClickableTr key={o.id} href={`/orders/${o.id}`}>
                  <td className="px-4 py-3 font-medium">{o.number}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {o.submittedAt.toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatNaira(o.totalKobo || o.subtotalKobo)}
                  </td>
                </ClickableTr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
