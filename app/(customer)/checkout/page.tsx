import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { requireCustomer } from "@/lib/session";
import { getCartSummary } from "@/lib/cart";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const session = await requireCustomer();
  const cart = await getCartSummary(session.user.id);
  if (cart.lines.length === 0) redirect("/cart");

  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to cart
        </Link>
        <nav className="mt-2 text-xs text-muted-foreground">
          <Link href="/cart" className="hover:text-foreground">Cart</Link>
          <span> / </span>
          <span className="text-foreground">Checkout</span>
        </nav>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Review &amp; submit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The back office will confirm logistics and email your invoice for bank transfer.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 rounded-2xl border bg-card p-6">
          <CheckoutForm addresses={addresses} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="font-serif text-xl font-semibold">Order summary</h2>
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
              {cart.lines.map((l) => (
                <li key={l.itemId} className="flex justify-between gap-3">
                  <span className="line-clamp-2 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {l.quantityCartons > 0 && `${l.quantityCartons}c`}
                      {l.quantityCartons > 0 && l.quantityPacks > 0 && " + "}
                      {l.quantityPacks > 0 && `${l.quantityPacks}p`}
                      {" "}
                    </span>
                    {l.name}{" "}
                    <span className="text-xs">({l.totalPacks} packs)</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatNaira(l.lineSubtotalKobo)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t pt-4 text-sm">
              <Row label="Subtotal" value={formatNaira(cart.subtotalKobo)} />
              <Row label="Logistics" value="Set by admin" />
              <Row label="Total weight" value={`${(cart.weightGrams / 1000).toFixed(2)} kg`} />
            </dl>
            <div className="border-t pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Estimated total</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {formatNaira(cart.subtotalKobo)}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Logistics added to final invoice
              </p>
            </div>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/cart">← Edit cart</Link>
            </Button>
          </div>
        </aside>
      </div>
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
