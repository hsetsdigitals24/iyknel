import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const [users, products, ordersOpen, ordersAwaitingPayment] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.count({ where: { active: true } }),
    db.order.count({
      where: {
        status: { in: ["SUBMITTED", "AWAITING_APPROVAL", "PAYMENT_REVIEW"] },
      },
    }),
    db.order.count({ where: { status: "AWAITING_PAYMENT" } }),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Overview
        </span>
        <h1 className="font-serif text-4xl">Back office</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Businesses" value={users} />
        <Stat label="Active products" value={products} />
        <Stat label="Needs review" value={ordersOpen} />
        <Stat label="Awaiting payment" value={ordersAwaitingPayment} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
        <CardTitle className="text-4xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
