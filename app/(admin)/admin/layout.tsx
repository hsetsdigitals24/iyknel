import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { UserMenu } from "@/components/user-menu";
import { BrandLogo } from "@/components/brand-logo";

type NavItem = {
  href: string;
  label: string;
  count?: number;
  tone?: "warning" | "info";
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const [pendingOrders, outOfStock, pendingQuotes] = await Promise.all([
    db.order.count({
      where: { status: { in: ["SUBMITTED", "AWAITING_APPROVAL", "PAYMENT_REVIEW"] } },
    }),
    db.product.count({
      where: { active: true, stockCartons: 0, stockLoosePieces: 0 },
    }),
    db.quoteRequest.count({ where: { status: "PENDING" } }),
  ]);

  const nav: NavItem[] = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/orders", label: "Orders", count: pendingOrders, tone: "warning" },
    { href: "/admin/products", label: "Products", count: outOfStock, tone: "warning" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/inventory", label: "Inventory", count: outOfStock, tone: "warning" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/quotes", label: "Quotes", count: pendingQuotes, tone: "info" },
    { href: "/admin/logistics", label: "Logistics" },
    { href: "/admin/audit", label: "Audit" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-card">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" href="/" />
            <span className="text-sm text-muted-foreground">/ back office</span>
          </div>
          <UserMenu />
        </div>
      </header>
      <div className="container grid flex-1 gap-10 py-10 md:grid-cols-[200px_1fr]">
        <aside className="space-y-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <span>{n.label}</span>
              {n.count && n.count > 0 ? <NavBadge count={n.count} tone={n.tone} /> : null}
            </Link>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

function NavBadge({ count, tone = "info" }: { count: number; tone?: "warning" | "info" }) {
  const styles =
    tone === "warning"
      ? "bg-amber-100 text-amber-900"
      : "bg-primary/10 text-primary";
  return (
    <span
      className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${styles}`}
      aria-label={`${count} pending`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
