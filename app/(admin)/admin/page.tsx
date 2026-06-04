import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const [users, products, ordersOpen, ordersAwaitingPayment, quotesPending] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.count({ where: { active: true } }),
    db.order.count({
      where: {
        status: { in: ["SUBMITTED", "AWAITING_APPROVAL", "PAYMENT_REVIEW"] },
      },
    }),
    db.order.count({ where: { status: "AWAITING_PAYMENT" } }),
    db.quoteRequest.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Overview
        </span>
        <h1 className="font-serif text-4xl">Back office</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Businesses" value={users} />
        <Stat label="Active products" value={products} />
        <Stat label="Needs review" value={ordersOpen} href="/admin/orders" />
        <Stat label="Awaiting payment" value={ordersAwaitingPayment} href="/admin/orders" />
        <Stat
          label="Pending quotes"
          value={quotesPending}
          href="/admin/quotes?status=PENDING"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const card = (
    <Card className={href ? "transition hover:border-primary/40 hover:shadow-sm" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-4xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
