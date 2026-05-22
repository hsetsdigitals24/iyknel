import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";

import { requireCustomer } from "@/lib/session";
import { listWishlist } from "@/lib/wishlist";
import { resolveImage } from "@/lib/r2";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WishlistRowActions } from "./row-actions";

export default async function WishlistPage() {
  const session = await requireCustomer();
  const items = await listWishlist(session.user.id);
  const itemImages = await Promise.all(items.map((i) => resolveImage(i.product.images[0])));

  return (
    <div className="space-y-6">
      <header>
        <nav className="text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <span> / </span>
          <span className="text-foreground">Wishlist</span>
        </nav>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Saved for later
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length === 0
            ? "Nothing saved yet."
            : `${items.length} ${items.length === 1 ? "product" : "products"} ready when you are`}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center">
          <Heart className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any product to save it here for later.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i, idx) => (
            <div
              key={i.id}
              className="flex gap-4 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
            >
              <Link
                href={`/products/${i.product.slug}`}
                className="relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-surface-muted"
              >
                {itemImages[idx] && (
                  <Image
                    src={itemImages[idx]!}
                    alt={i.product.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col justify-between gap-2">
                <div>
                  <Link
                    href={`/products/${i.product.slug}`}
                    className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
                  >
                    {i.product.name}
                  </Link>
                  <p className="mt-1 text-base font-bold tabular-nums text-primary">
                    {formatNaira(i.product.priceKobo)}
                  </p>
                </div>
                <WishlistRowActions productId={i.product.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
