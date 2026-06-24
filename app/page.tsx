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
import { CategoryTile } from "@/components/category-tile";
import { FeaturedProductsCarousel } from "@/components/featured-products-carousel";
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

  // Per-category product rows (top categories with at least one active product).
  // Queried sequentially: the pooled DB connection limit is 1, so a parallel
  // fan-out here exhausts the pool and times out.
  const categorySections: {
    id: string;
    name: string;
    slug: string;
    products: FeaturedProduct[];
  }[] = [];
  for (const cat of categories.slice(0, 6)) {
    const prods = await db.product.findMany({
      where: { active: true, categoryId: cat.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { category: { select: { name: true } } },
    });
    if (prods.length === 0) continue;
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
        <section className="container py-12 md:py-16">
          <div className="mb-6 flex items-end justify-between">
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

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10">
            {categories.map((c, i) => (
              <CategoryTile key={c.id} slug={c.slug} name={c.name} image={categoryImageUrls[i]} />
            ))}
          </div>
        </section>

        {/* Featured products carousel */}
        <section className="bg-[#93d9fd]">
          <div className="container py-12 md:py-16">
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
            <div className="container py-12 md:py-16">
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

        <br />
        <br />
        {/* Secondary banner */}
        <section className="container pb-8">
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
