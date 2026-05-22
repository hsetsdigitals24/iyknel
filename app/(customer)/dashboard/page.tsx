import Link from "next/link";
import { ArrowRight, Heart, Package, ShoppingBag, ShoppingCart } from "lucide-react";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { ClickableTr } from "@/components/clickable-row";

export default async function CustomerDashboard() {
  const session = await getSession();
  const userId = session!.user.id;

  const [business, recentOrders, openOrdersCount, cart, wishlistCount] = await Promise.all([
    db.business.findUnique({ where: { userId } }),
    db.order.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { id: true, number: true, status: true, totalKobo: true, submittedAt: true },
    }),
    db.order.count({
      where: {
        userId,
        status: {
          in: ["SUBMITTED", "AWAITING_APPROVAL", "AWAITING_PAYMENT", "PAYMENT_REVIEW", "PAID", "DISPATCHED"],
        },
      },
    }),
    db.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    }),
    db.wishlistItem.count({ where: { wishlist: { userId } } }),
  ]);

  const cartLines =
    cart?.items.map((item) => {
      const totalPieces =
        item.quantityCartons * (item.product.unitsPerCarton ?? 0) + item.quantityPieces;
      return { totalPieces, lineKobo: totalPieces * item.product.priceKobo };
    }) ?? [];
  const cartItemCount = cartLines.reduce((sum, l) => sum + l.totalPieces, 0);
  const cartSubtotalKobo = cartLines.reduce((sum, l) => sum + l.lineKobo, 0);

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border bg-card p-6 md:p-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Welcome back
        </span>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          {business?.name ?? "Your business"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {business?.contactName ? `Hi ${business.contactName}, ` : ""}here&apos;s a quick look at
          your account.
        </p>
        <div className="mt-4">
          <Button asChild className="rounded-full">
            <Link href="/products">
              Browse catalog <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          href="/cart"
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Cart"
          primary={cartItemCount === 0 ? "Empty" : `${cartItemCount} ${cartItemCount === 1 ? "item" : "items"}`}
          secondary={cartItemCount > 0 ? formatNaira(cartSubtotalKobo) : "Add items to start an order"}
          cta="Open cart"
        />
        <StatCard
          href="/orders"
          icon={<Package className="h-5 w-5" />}
          label="Open orders"
          primary={openOrdersCount.toString()}
          secondary={openOrdersCount > 0 ? "Awaiting approval, payment or dispatch" : "Nothing in flight"}
          cta="Track orders"
        />
        <StatCard
          href="/wishlist"
          icon={<Heart className="h-5 w-5" />}
          label="Wishlist"
          primary={wishlistCount.toString()}
          secondary={wishlistCount > 0 ? "Saved for later" : "Save products for next restock"}
          cta="View wishlist"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Recent orders</h2>
          <Link href="/orders" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-base font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Build a cart and submit your first order.
            </p>
            <Button asChild className="mt-4 rounded-full">
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
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
                {recentOrders.map((o) => (
                  <ClickableTr key={o.id} href={`/orders/${o.id}`}>
                    <td className="px-4 py-3 font-medium">{o.number}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.submittedAt.toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatNaira(o.totalKobo ?? 0)}
                    </td>
                  </ClickableTr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  primary,
  secondary,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        {label}
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight tabular-nums">{primary}</p>
        <p className="mt-1 text-sm text-muted-foreground">{secondary}</p>
      </div>
      <p className="mt-auto text-sm font-medium text-primary group-hover:underline">
        {cta} →
      </p>
    </Link>
  );
}
