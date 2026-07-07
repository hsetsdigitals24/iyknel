import Link from "next/link";
import Image from "next/image";

import { db } from "@/lib/db";
import { categoryIcon } from "@/lib/category-icon";
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
import { ArrowRight } from "lucide-react";

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
  stockLoosePacks: number;
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
    stock: p.stockCartons * (p.unitsPerCarton ?? 0) + p.stockLoosePacks,
    badge,
    wishlisted: savedIds.has(p.id),
  };
}

export default async function LandingPage() {
  const [categories, products] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 14,
      select: {
        id: true,
        slug: true,
        name: true,
        priceKobo: true,
        images: true,
        stockCartons: true,
        unitsPerCarton: true,
        stockLoosePacks: true,
        category: { select: { name: true } },
      },
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
  // products). One bounded query per category, run in parallel — the pool
  // (connection_limit=10) comfortably absorbs the fan-out, and each query pulls
  // at most 10 rows with only the fields the card renders instead of the whole
  // catalog. Fetching 10 also lets us hide categories with fewer than 5.
  const perCategory = await Promise.all(
    categories.map((cat) =>
      db.product.findMany({
        where: { active: true, categoryId: cat.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          slug: true,
          name: true,
          priceKobo: true,
          images: true,
          stockCartons: true,
          unitsPerCarton: true,
          stockLoosePacks: true,
          category: { select: { name: true } },
        },
      }),
    ),
  );

  const categorySections: {
    id: string;
    name: string;
    slug: string;
    products: FeaturedProduct[];
  }[] = [];
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const prods = perCategory[ci];
    // Hide any category with fewer than 5 active products.
    if (prods.length < 5) continue;
    const images = await Promise.all(prods.map((p) => resolveImage(p.images[0])));
    categorySections.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      products: prods.map((p, i) => mapProduct(p, images[i] ?? null, savedIds)),
    });
  }
  const slides = [
    {
      eyebrow: "Oils",
      title: "Cooking oils, by the carton",
      copy: "Power Oil, King's and Laziz in retail and bulk sizes — priced for volume, delivered to your store.",
      cta: { label: "Shop oils", href: "/products?category=oil" },
      image: "/slider/oils.jpeg",
      tint: "from-amber-950/70",
    },
    {
      eyebrow: "Dairy & Creamer",
      title: "Dano milk, always in stock",
      copy: "Full cream milk powder in sachets and cartons, ready for your shelves.",
      cta: { label: "Shop creamer", href: "/products?category=creamer" },
      image: "/slider/creamer.jpeg",
      tint: "from-sky-950/70",
    },
    {
      eyebrow: "Noodles",
      title: "Indomie moves fast. Stay stocked.",
      copy: "Chicken, Onion Chicken and Oriental — single packs to super-pack cartons.",
      cta: { label: "Shop noodles", href: "/products?category=noodles" },
      image: "/slider/noodles.jpeg",
      tint: "from-red-950/70",
    },
    {
      eyebrow: "Pasta & Flour",
      title: "Golden Penny pasta & swallow staples",
      copy: "Spaghetti, twist, yam and beans flour — the staples your customers ask for daily.",
      cta: { label: "Shop pasta", href: "/products?category=pasta" },
      image: "/slider/pasta.jpeg",
      tint: "from-orange-950/70",
    },
    {
      eyebrow: "Seasoning & Spices",
      title: "Season every sale",
      copy: "Sonia tomato paste and pepper, AACE curry and thyme — stocked in full cartons.",
      cta: { label: "Shop spices", href: "/products?category=spices" },
      image: "/slider/seasoning.jpeg",
      tint: "from-emerald-950/70",
    },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* [&>section]:transform-gpu forces each section onto its own stable GPU
          layer, working around a Chrome bug where large sections blank out while
          scrolling and only repaint when scrolled back into view. */}
      <main className="flex-1 [&>section]:transform-gpu">
        {/* Hero — background image band with the promo carousel layered on top */}
        <section className="relative bg-cover bg-center bg-no-repeat">
          {/* subtle overlay so the carousel edges read cleanly over any image */}
          <div className="absolute inset-0 bg-white" />
          <div className="relative">
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
                  {categories.map((c) => {
                    const Icon = categoryIcon({ name: c.name, slug: c.slug });
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/products?category=${c.slug}`}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">{c._count.products}</span>
                        </Link>
                      </li>
                    );
                  })}
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
        <section className="bg-white">
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
              {/* <Button asChild variant="outline" className="rounded-full"> */}
              <Link href="/products">
                <span className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Browse all products
                  <ArrowRight className="ml-1 inline h-3 w-3" />
                </span>
              </Link>
              {/* </Button> */}
            </div>

            <FeaturedProductsCarousel products={featured} />
          </div>
        </section>

        {/* Per-category product rows */}
        {categorySections.map((section, i) => (
          <section key={section.id} className={i % 2 === 1 ? "" : ""}>
            <div className="container py-4 md:py-8">
              <div className="mb-5 flex items-center justify-between px-4 py-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Shop {section.name}
                  </span>
                  <h4 className="mt-1 font-serif text-lg font-semibold tracking-tight md:text-xl">
                    {section.name}
                  </h4>
                </div>
                <Link href={`/products?category=${section.slug}`}>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    View more
                    <ArrowRight className="ml-1 inline h-3 w-3" />
                  </span>
                </Link>
               
              </div>

              <FeaturedProductsCarousel products={section.products} />
            </div>
          </section>
        ))}

        {/* Trusted partners */}
        <TrustedPartners />

        {/* Secondary banner */}
        <section className="container py-8">
          <div className="grid overflow-hidden rounded-2xl bg-[#92d9fd] text-white md:grid-cols-2">
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
                  className="rounded-full bg-white text-slate-700 hover:bg-white/90 hover:text-primary"
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
