import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Banknote, Truck } from "lucide-react";

import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getWishlistProductIds } from "@/lib/wishlist";
import { buildPromoSlides } from "@/lib/promo";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PromoCarousel } from "@/components/promo-carousel";
import { CategoryTile } from "@/components/category-tile";
import { FeaturedProductsCarousel } from "@/components/featured-products-carousel";
import { WhyIyknel } from "@/components/why-iyknel";

export default async function LandingPage() {
  const [categories, products, slides] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 14,
      include: { category: { select: { name: true } } },
    }),
    buildPromoSlides(),
  ]);
  const categoryImageUrls = await Promise.all(categories.map((c) => resolveImage(c.image)));

  const session = await getSession();
  const savedIds = session?.user?.id
    ? await getWishlistProductIds(session.user.id)
    : new Set<string>();
  const featuredImages = await Promise.all(products.map((p) => resolveImage(p.images[0])));
  const featured = products.map((p, i) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceKobo: p.priceKobo,
    image: featuredImages[i] ?? undefined,
    category: p.category?.name ?? null,
    stock: p.stockCartons * (p.unitsPerCarton ?? 0) + p.stockLoosePieces,
    badge:
      i % 7 === 0
        ? ("deal" as const)
        : i % 5 === 0
        ? ("bestseller" as const)
        : i % 11 === 0
        ? ("new" as const)
        : null,
    wishlisted: savedIds.has(p.id),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero promo carousel */}
        <section className="container pt-6 md:pt-8">
          <PromoCarousel slides={slides} />
        </section>

        <WhyIyknel />

        {/* Category tiles */}
        <section className="container py-12 md:py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                Shop by category
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every shelf, restocked from one invoice.
              </p>
            </div>
            <Link href="/products" className="text-sm font-medium text-primary hover:underline">
              See all →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10">
            {categories.map((c, i) => (
              <CategoryTile
                key={c.id}
                slug={c.slug}
                name={c.name}
                image={categoryImageUrls[i]}
              />
            ))}
          </div>
        </section>

        {/* Featured products carousel */}
        <section className="bg-surface-muted">
          <div className="container py-12 md:py-16">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Featured
                </span>
                <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                  Trending in wholesale
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hand-picked top sellers across categories.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/products">Browse all products</Link>
              </Button>
            </div>

            <FeaturedProductsCarousel products={featured} />
          </div>
        </section>

        {/* Trust band */}
        <section className="container py-12 md:py-14">
          <div className="grid gap-6 md:grid-cols-3">
            <TrustItem
              icon={<Banknote className="h-6 w-6 text-primary" />}
              title="Bank-transfer checkout"
              body="No payment gateways. Pay by transfer to your invoice — the back office verifies and clears."
            />
            <TrustItem
              icon={<Truck className="h-6 w-6 text-primary" />}
              title="Logistics computed"
              body="Vehicle and price are auto-selected from your order weight and delivery distance. No surprises."
            />
            <TrustItem
              icon={<BadgeCheck className="h-6 w-6 text-primary" />}
              title="Verified businesses"
              body="B2B only. Sign up with your business name, RC number and delivery address."
            />
          </div>
        </section>

        {/* Secondary banner */}
        <section className="container pb-16">
          <div className="grid overflow-hidden rounded-2xl border bg-[#002bd0] text-white md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                For wholesalers & retailers
              </span>
              <h3 className="font-serif text-3xl font-semibold leading-tight md:text-5xl text-white">
                Open a wholesale account in minutes. 
              </h3>
              <p className="max-w-md text-white/85">
                Submit your business details, get verified, and start placing bulk orders. Invoices,
                logistics and delivery — all handled.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" variant="secondary" className="rounded-full bg-[#ffc300] text-white hover:bg-[#002bd0]/90">
                  <Link href="/register">Open an account</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-white text-[#002bd0] hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link href="/products">Browse catalog</Link>
                </Button>
              </div>
            </div>
            <div className="relative md:aspect-auto">
              <Image
                src="/auth.svg"
                alt="Wholesale warehouse"
                fill
                sizes="(min-width: 568px) 10vw, 30vw"
                className="object-contain"
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-4 rounded-xl border bg-card p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold leading-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
