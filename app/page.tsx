import Link from "next/link";
import Image from "next/image";

import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getWishlistProductIds } from "@/lib/wishlist";
import { buildPromoSlides } from "@/lib/promo";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PromoCarousel } from "@/components/promo-carousel";
import { FeaturedProductsCarousel } from "@/components/featured-products-carousel";
import { ProductCard } from "@/components/product-card";
// import { WhyIyknel } from "@/components/why-iyknel";
import { TrustedPartners } from "@/components/trusted-partners";

type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  image?: string;
  category?: string | null;
  stock?: number;
  badge?: "deal" | "new" | "bestseller" | null;
  wishlisted?: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  images: string[];
  stockCartons: number;
  unitsPerCarton: number | null;
  stockLoosePieces: number;
  category?: { name: string } | null;
};

function mapProduct(
  p: ProductRow,
  image: string | null,
  savedIds: Set<string>,
  badge: FeaturedProduct["badge"] = null,
): FeaturedProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceKobo: p.priceKobo,
    image: image ?? undefined,
    category: p.category?.name ?? null,
    stock: p.stockCartons * (p.unitsPerCarton ?? 0) + p.stockLoosePieces,
    badge,
    wishlisted: savedIds.has(p.id),
  };
}

export default async function LandingPage() {
  const [categories, products, slides] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 14,
      include: { category: { select: { name: true } } },
    }),
    buildPromoSlides(),
  ]);
  const session = await getSession();
  const savedIds = session?.user?.id
    ? await getWishlistProductIds(session.user.id)
    : new Set<string>();

  const featuredImages = await Promise.all(products.map((p) => resolveImage(p.images[0])));
  const featured = products.map((p, i) =>
    mapProduct(
      p,
      featuredImages[i] ?? null,
      savedIds,
      i % 7 === 0
        ? "deal"
        : i % 5 === 0
        ? "bestseller"
        : i % 11 === 0
        ? "new"
        : null,
    ),
  );

  // Per-category product rows (every active category with at least 5 active
  // products). Fetched in a single query and grouped in memory: the pooled DB
  // connection limit is 1, so a per-category fan-out would exhaust the pool, and
  // one round-trip scales regardless of how many categories qualify.
  const allActiveProducts = await db.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } } },
  });

  const productsByCategory = new Map<string, typeof allActiveProducts>();
  for (const p of allActiveProducts) {
    if (!p.categoryId) continue;
    const bucket = productsByCategory.get(p.categoryId);
    if (bucket) bucket.push(p);
    else productsByCategory.set(p.categoryId, [p]);
  }

  const categorySections: {
    id: string;
    name: string;
    slug: string;
    products: FeaturedProduct[];
  }[] = [];
  for (const cat of categories) {
    const all = productsByCategory.get(cat.id) ?? [];
    // Hide any category with fewer than 5 active products.
    if (all.length < 5) continue;
    const prods = all.slice(0, 10);
    const images = await Promise.all(prods.map((p) => resolveImage(p.images[0])));
    categorySections.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      products: prods.map((p, i) => mapProduct(p, images[i] ?? null, savedIds)),
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — background image band with the promo carousel layered on top */}
        <section
          className="relative bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/background.jpeg')" }}
        >
          {/* subtle overlay so the carousel edges read cleanly over any image */}
          <div className="absolute inset-0 bg-black/20" />
          <div className="container relative pb-8 pt-6 md:pb-12 md:pt-8">
            <PromoCarousel slides={slides} />
          </div>
        </section>

        {/* Category tiles */}
        <section className="container py-8 md:py-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold tracking-tight md:text-2xl">
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

          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* Category sidebar */}
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/products"
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      <span>All categories</span>
                    </Link>
                  </li>
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/products?category=${c.slug}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c._count.products}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Product grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {featured.map((p) => (
                <ProductCard
                  key={p.id}
                  productId={p.id}
                  slug={p.slug}
                  name={p.name}
                  priceKobo={p.priceKobo}
                  image={p.image}
                  category={p.category}
                  stock={p.stock}
                  badge={p.badge ?? null}
                  wishlisted={p.wishlisted}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Featured products carousel */}
        <section className="bg-[#93d9fd]">
          <div className="container py-2 md:py-10">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Featured
                </span>
                <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight md:text-2xl">
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

        {/* Per-category product rows */}
        {categorySections.map((section, i) => (
          <section key={section.id} className={i % 2 === 1 ? "bg-[#93d9fd]" : "bg-[#93d9fd]"}>
            <div className="container py-2 md:py-4">
              <div className="mb-5 flex items-center justify-between bg-white px-4 py-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Shop {section.name}
                  </span>
                  <h4 className="mt-1 font-serif text-lg font-semibold tracking-tight md:text-xl">
                    {section.name}
                  </h4>
                </div>
                <Button className="rounded-full bg-accent text-white hover:bg-primary/100">
                  <Link href={`/products?category=${section.slug}`}>View more</Link>
                </Button>
              </div>

              <FeaturedProductsCarousel products={section.products} />
            </div>
          </section>
        ))}

        {/* Trusted partners */}
        <TrustedPartners />

        {/* Secondary banner */}
        <section className="container py-8">
          <div className="grid overflow-hidden rounded-2xl bg-[#93d9fd] text-white md:grid-cols-2">
            <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700/80">
                For wholesalers & retailers
              </span>
              <h3 className="font-serif text-3xl font-semibold leading-tight text-slate-700 md:text-5xl">
                Open a wholesale account in minutes.
              </h3>
              <p className="max-w-md text-slate-700/85">
                Submit your business details, get verified, and start placing bulk orders. Invoices,
                logistics and delivery — all handled.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  <Link href="/register">Open an account</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-white text-primary hover:bg-white/90 hover:text-primary"
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
