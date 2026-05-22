import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { UserMenu } from "@/components/user-menu";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/logistics", label: "Logistics" },
  { href: "/admin/audit", label: "Audit" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/admin" className="font-serif text-xl">
            Iyknel <span className="text-muted-foreground">/ back office</span>
          </Link>
          <UserMenu />
        </div>
      </header>
      <div className="container grid flex-1 gap-10 py-10 md:grid-cols-[200px_1fr]">
        <aside className="space-y-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
