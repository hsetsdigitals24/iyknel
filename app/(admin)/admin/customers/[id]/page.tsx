import Link from "next/link";
import { notFound } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";
import { OrderStatusPill } from "@/components/order-status-pill";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await db.user.findUnique({
    where: { id: params.id },
    include: { business: true, addresses: true },
  });
  if (!customer || customer.role !== "CUSTOMER") notFound();

  const [orders, totals] = await Promise.all([
    db.order.findMany({
      where: { userId: customer.id },
      orderBy: { submittedAt: "desc" },
      take: 20,
      select: { id: true, number: true, status: true, totalKobo: true, submittedAt: true },
    }) as Promise<Array<{
      id: string;
      number: string;
      status: OrderStatus;
      totalKobo: number;
      submittedAt: Date;
    }>>,
    db.order.aggregate({
      where: { userId: customer.id, status: { in: ["PAID", "DISPATCHED", "DELIVERED"] } },
      _sum: { totalKobo: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/customers"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All customers
      </Link>

      <header className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Customer
        </span>
        <h1 className="font-serif text-3xl">{customer.business?.name ?? customer.email}</h1>
        <p className="text-sm text-muted-foreground">
          {customer.business?.contactName ?? customer.name ?? "—"} · {customer.email} ·{" "}
          {customer.business?.phone ?? customer.phone ?? "—"}
        </p>
        {customer.business?.rcNumber && (
          <p className="text-xs text-muted-foreground">RC: {customer.business.rcNumber}</p>
        )}
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Stat label="Paid orders" value={String(totals._count._all)} />
        <Stat
          label="Lifetime revenue"
          value={formatNaira(totals._sum.totalKobo ?? 0)}
        />
        <Stat label="Addresses" value={String(customer.addresses.length)} />
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40"
                >
                  <span className="flex-1 font-medium">{o.number}</span>
                  <OrderStatusPill status={o.status} />
                  <span className="w-28 text-right tabular-nums">{formatNaira(o.totalKobo)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Saved addresses</h2>
        {customer.addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">None on file.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {customer.addresses.map((a) => (
              <li key={a.id} className="rounded-md border p-4 text-sm">
                <div>{a.line1}</div>
                {a.line2 && <div className="text-muted-foreground">{a.line2}</div>}
                <div className="text-muted-foreground">
                  {a.city}, {a.state}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl tabular-nums">{value}</p>
    </div>
  );
}
