import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";

import { requireCustomer } from "@/lib/session";
import { getCartSummary } from "@/lib/cart";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CartLineRow } from "@/components/cart-line";

export default async function CartPage() {
  const session = await requireCustomer();
  const cart = await getCartSummary(session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <nav className="text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <span> / </span>
          <span className="text-foreground">Cart</span>
        </nav>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Your cart
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cart.lines.length === 0
            ? "Nothing here yet — add products to start an order."
            : `${cart.itemCount} pcs across ${cart.lines.length} product${cart.lines.length === 1 ? "" : "s"}${cart.cartonCount > 0 ? ` · ${cart.cartonCount} carton${cart.cartonCount === 1 ? "" : "s"}` : ""}`}
        </p>
      </header>

      {cart.lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the catalog and start adding products.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="divide-y">
              {cart.lines.map((l) => (
                <CartLineRow key={l.itemId} line={l} />
              ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <h2 className="font-serif text-xl font-semibold">Order summary</h2>
              <dl className="space-y-2 text-sm">
                <Row label="Subtotal" value={formatNaira(cart.subtotalKobo)} />
                <Row label="Cartons" value={String(cart.cartonCount)} />
                <Row label="Total pieces" value={String(cart.itemCount)} />
                <Row
                  label="Total weight"
                  value={`${(cart.weightGrams / 1000).toFixed(2)} kg`}
                />
              </dl>
              <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
                Logistics cost is computed by the back office after submission, based on your
                delivery address and total order weight.
              </div>
              <div className="border-t pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="text-2xl font-bold tabular-nums text-primary">
                    {formatNaira(cart.subtotalKobo)}
                  </span>
                </div>
                <p className="mt-0.5 text-right text-xs text-muted-foreground">
                  + logistics, computed at checkout
                </p>
              </div>
              <Button asChild size="lg" className="w-full rounded-full">
                <Link href="/checkout">
                  Proceed to checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/products">Continue shopping</Link>
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
