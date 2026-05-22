import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronRight, ShieldCheck, Truck } from "lucide-react";

import { db } from "@/lib/db";
import { resolveImage, resolveImages } from "@/lib/r2";
import { formatNaira } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { AddToCartForm } from "@/components/add-to-cart-form";
import { WishlistButton } from "@/components/wishlist-button";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: { category: true },
  });
  if (!product || !product.active) notFound();

  const totalPiecesAvailable =
    product.stockCartons * (product.unitsPerCarton ?? 0) + product.stockLoosePieces;
  const inStock = totalPiecesAvailable > 0;
  const lowStock = inStock && totalPiecesAvailable < 20;

  const related = product.categoryId
    ? await db.product.findMany({
        where: {
          active: true,
          categoryId: product.categoryId,
          NOT: { id: product.id },
        },
        orderBy: { createdAt: "desc" },
        include: { category: true },
        take: 8,
      })
    : [];

  const galleryImages = await resolveImages(product.images);
  const relatedImages = await Promise.all(related.map((p) => resolveImage(p.images[0])));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1 bg-surface-muted/40">
        <div className="container py-6">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/products" className="hover:text-foreground">Catalog</Link>
            {product.category && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="truncate text-foreground">{product.name}</span>
          </nav>
        </div>

        <div className="container pb-12">
          <div className="grid gap-10 rounded-2xl border bg-card p-6 md:p-10 lg:grid-cols-2">
            <ProductGallery images={galleryImages} alt={product.name} />

            <div className="flex flex-col gap-5">
              {product.category && (
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/15"
                >
                  {product.category.name}
                </Link>
              )}

              <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold tabular-nums text-primary md:text-4xl">
                  {formatNaira(product.priceKobo)}
                </p>
                <span className="text-xs text-muted-foreground">per unit</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    In stock
                    {product.unitsPerCarton != null && product.stockCartons > 0 && (
                      <span className="font-normal text-success/80">
                        · {product.stockCartons} carton{product.stockCartons === 1 ? "" : "s"}
                        {product.stockLoosePieces > 0 && ` + ${product.stockLoosePieces} loose`}
                      </span>
                    )}
                    {(product.unitsPerCarton == null || product.stockCartons === 0) && (
                      <span className="font-normal text-success/80">
                        · {product.stockLoosePieces} pcs
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive ring-1 ring-destructive/30">
                    Out of stock
                  </span>
                )}
                {lowStock && (
                  <span className="inline-flex items-center rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-[hsl(var(--warning-foreground))] ring-1 ring-warning/40">
                    Only {totalPiecesAvailable} pcs left
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-surface-muted/50 p-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">SKU</dt>
                  <dd className="mt-0.5 font-medium">{product.sku}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Weight / piece
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {(product.weightGrams / 1000).toFixed(2)} kg
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Per carton
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {product.unitsPerCarton != null
                      ? `${product.unitsPerCarton} pcs`
                      : "Sold by piece"}
                  </dd>
                </div>
              </dl>

              {product.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              )}

              <div className="mt-auto space-y-3 pt-4">
                <AddToCartForm
                  productId={product.id}
                  unitsPerCarton={product.unitsPerCarton}
                  stockCartons={product.stockCartons}
                  stockLoosePieces={product.stockLoosePieces}
                  priceKobo={product.priceKobo}
                />
                <WishlistButton productId={product.id} />
              </div>

              <div className="grid gap-3 border-t pt-5 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Logistics auto-priced</p>
                    <p className="text-xs text-muted-foreground">
                      Vehicle picked by total order weight; cost set by distance band.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">B2B bank transfer</p>
                    <p className="text-xs text-muted-foreground">
                      Pay against your invoice — verified by the back office.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-12">
              <div className="mb-6 flex items-end justify-between">
                <h2 className="font-serif text-2xl font-semibold tracking-tight">
                  Related products
                </h2>
                {product.category && (
                  <Link
                    href={`/products?category=${product.category.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View all in {product.category.name} →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {related.slice(0, 4).map((p, i) => (
                  <ProductCard
                    key={p.id}
                    slug={p.slug}
                    name={p.name}
                    priceKobo={p.priceKobo}
                    image={relatedImages[i] ?? undefined}
                    category={p.category?.name}
                    stock={p.stockCartons * (p.unitsPerCarton ?? 0) + p.stockLoosePieces}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
