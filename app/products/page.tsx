import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";
import { getSession } from "@/lib/session";
import { getWishlistProductIds } from "@/lib/wishlist";
import { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type SP = { q?: string; category?: string; sort?: string; inStock?: string; page?: string };

const PAGE_SIZE = 60;

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  "price-asc": { priceKobo: "asc" },
  "price-desc": { priceKobo: "desc" },
  name: { name: "asc" },
};

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const q = searchParams.q?.trim() ?? "";
  const categorySlug = searchParams.category?.trim() ?? "";
  const sortKey = (searchParams.sort && SORTS[searchParams.sort]) ? searchParams.sort! : "newest";
  const inStockOnly = searchParams.inStock === "1";
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const filters: Prisma.ProductWhereInput[] = [];
  if (q) {
    filters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (inStockOnly) {
    filters.push({
      OR: [{ stockCartons: { gt: 0 } }, { stockLoosePieces: { gt: 0 } }],
    });
  }
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(filters.length ? { AND: filters } : {}),
  };

  const [categories, products, total] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    db.product.findMany({
      where,
      orderBy: SORTS[sortKey],
      include: { category: true },
      take: page * PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);

  const productImages = await Promise.all(products.map((p) => resolveImage(p.images[0])));
  const session = await getSession();
  const savedIds = session?.user?.id
    ? await getWishlistProductIds(session.user.id)
    : new Set<string>();

  const activeCategoryName =
    categorySlug && categories.find((c) => c.slug === categorySlug)?.name;

  const baseParams = (overrides: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = {
      q,
      category: categorySlug,
      sort: sortKey,
      inStock: inStockOnly ? "1" : "",
      page: page > 1 ? String(page) : "",
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v as string);
    });
    return `/products${p.toString() ? `?${p.toString()}` : ""}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1 bg-surface-muted/40">
        {/* Page header */}
        <div className="border-b bg-background">
          <div className="container py-6">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link href="/products" className="hover:text-foreground">Catalog</Link>
              {activeCategoryName && (
                <>
                  <span>/</span>
                  <span className="text-foreground">{activeCategoryName}</span>
                </>
              )}
            </nav>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              {activeCategoryName ?? "All products"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total.toLocaleString()} {total === 1 ? "product" : "products"}
              {q && <> · matching “{q}”</>}
            </p>
          </div>
        </div>

        <div className="container grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
          {/* Filters sidebar */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </h2>
                {(q || categorySlug || inStockOnly) && (
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <X className="h-3 w-3" /> Clear
                  </Link>
                )}
              </div>

              <form action="/products" method="get" className="mb-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search…"
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
                {sortKey && <input type="hidden" name="sort" value={sortKey} />}
                {inStockOnly && <input type="hidden" name="inStock" value="1" />}
              </form>

              <div className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href={baseParams({ category: "" })}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                        !categorySlug ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary"
                      }`}
                    >
                      <span>All categories</span>
                    </Link>
                  </li>
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={baseParams({ category: c.slug })}
                        className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                          categorySlug === c.slug
                            ? "bg-primary/10 font-medium text-primary"
                            : "hover:bg-secondary"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c._count.products}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Availability
                </h3>
                <Link
                  href={baseParams({ inStock: inStockOnly ? "" : "1" })}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    inStockOnly ? "bg-primary/10 font-medium text-primary" : "hover:bg-secondary"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      inStockOnly ? "border-primary bg-primary text-primary-foreground" : "border-input"
                    }`}
                  >
                    {inStockOnly && <span className="text-xs">✓</span>}
                  </span>
                  In stock only
                </Link>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div>
            {/* Sort bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{products.length}</span>{" "}
                of {total}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Sort
                </label>
                <SortLinks current={sortKey} hrefFor={(s) => baseParams({ sort: s })} />
              </div>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
                <p className="text-base font-medium">No products match your search.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try clearing filters or searching for something else.
                </p>
                <Button asChild className="mt-4 rounded-full">
                  <Link href="/products">Clear filters</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((p, i) => (
                    <ProductCard
                      key={p.id}
                      productId={p.id}
                      slug={p.slug}
                      name={p.name}
                      priceKobo={p.priceKobo}
                      image={productImages[i] ?? undefined}
                      category={p.category?.name}
                      stock={p.stockCartons * (p.unitsPerCarton ?? 0) + p.stockLoosePieces}
                      badge={i % 7 === 0 ? "deal" : i % 11 === 0 ? "bestseller" : null}
                      wishlisted={savedIds.has(p.id)}
                    />
                  ))}
                </div>
                {products.length < total && (
                  <div className="mt-8 flex justify-center">
                    <Button asChild variant="outline" size="lg" className="rounded-full">
                      <Link href={baseParams({ page: String(page + 1) })}>
                        Load more · {total - products.length} remaining
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function SortLinks({
  current,
  hrefFor,
}: {
  current: string;
  hrefFor: (s: string) => string;
}) {
  const opts = [
    { key: "newest", label: "Newest" },
    { key: "price-asc", label: "Price ↑" },
    { key: "price-desc", label: "Price ↓" },
    { key: "name", label: "Name" },
  ];
  return (
    <div className="flex flex-wrap gap-1 text-sm">
      {opts.map((o) => (
        <Link
          key={o.key}
          href={hrefFor(o.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            current === o.key
              ? "bg-primary text-primary-foreground"
              : "border bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

