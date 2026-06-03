import Link from "next/link";
import { Heart, Search, ShoppingCart } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { BrandLogo } from "@/components/brand-logo";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

async function getCartCount(): Promise<number> {
  const s = await getSession();
  if (!s?.user?.id) return 0;
  const cart = await db.cart.findUnique({
    where: { userId: s.user.id },
    select: { items: { select: { id: true } } },
  });
  return cart?.items.length ?? 0;
}

export async function SiteHeader() {
  const cartCount = await getCartCount();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center gap-4">
        <BrandLogo size="sm" priority />

        <form action="/products" method="get" className="hidden flex-1 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search products, brands, categories…"
              className="h-10 w-full rounded-full border border-input bg-secondary/40 pl-10 pr-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </form>

        <nav className="flex items-center gap-1">
          <Link
            href="/products"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground lg:inline-flex"
          >
            Catalog
          </Link>
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `Cart (${cartCount} items)` : "Cart"}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <div className="ml-1 hidden md:block">
            <UserMenu />
          </div>
        </nav>
      </div>

      <div className="border-t md:hidden">
        <form action="/products" method="get" className="container py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              placeholder="Search products…"
              className="h-10 w-full rounded-full border border-input bg-secondary/40 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
