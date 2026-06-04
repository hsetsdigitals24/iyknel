import "server-only";

import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";
import type { Slide } from "@/components/promo-carousel";

const TINT_A = "from-[#FBE6D2] via-[#FDF3E8] to-background";
const TINT_B = "from-[#E8EEF7] via-[#F4F7FB] to-background";

const FALLBACK_IMAGE = "/placeholders/banner.svg";

function pluralize(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural;
}

export async function buildPromoSlides(): Promise<Slide[]> {
  const [newArrivals, featuredProducts, categories] = await Promise.all([
    db.product.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, name: true, images: true },
    }),
    db.product.findMany({
      where: { active: true, featured: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, name: true, images: true },
    }),
    db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 3,
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
  ]);

  const slides: Slide[] = [];

  // Slide A — New arrivals (always present; static fallback when empty)
  if (newArrivals.length > 0) {
    const lead = newArrivals[0];
    const others = newArrivals.length - 1;
    const image = (await resolveImage(lead.images[0])) || FALLBACK_IMAGE;
    slides.push({
      eyebrow: "New arrivals",
      title: "Fresh in this week.",
      copy:
        others > 0
          ? `${lead.name} and ${others} more freshly added or restocked across the catalog.`
          : `${lead.name} just landed — fresh from the warehouse.`,
      cta: { label: "Shop new arrivals", href: "/products?sort=newest" },
      image,
      tint: TINT_A,
    });
  } else {
    slides.push({
      eyebrow: "New arrivals",
      title: "Baby care, restocked.",
      copy: "Pampers, Huggies, Cussons, Johnson's — everything for the nursery shelf in one order.",
      cta: { label: "Browse baby care", href: "/products" },
      image: FALLBACK_IMAGE,
      tint: TINT_A,
    });
  }

  // Slide B — Featured (skipped entirely when none flagged)
  if (featuredProducts.length > 0) {
    const lead = featuredProducts[0];
    const others = featuredProducts.length - 1;
    const image = (await resolveImage(lead.images[0])) || FALLBACK_IMAGE;
    slides.push({
      eyebrow: "Featured",
      title: "Featured picks.",
      copy:
        others > 0
          ? `${lead.name} and ${others} more hand-picked for your next restock.`
          : `${lead.name} — hand-picked for your next restock.`,
      cta: { label: "Shop featured", href: "/products?featured=1" },
      image,
      tint: TINT_B,
    });
  }

  // Slides C…E — Top categories (skipped if zero active products)
  for (const cat of categories) {
    const count = cat._count.products;
    if (count === 0) continue;
    let imageKey: string | null = cat.image ?? null;
    if (!imageKey) {
      const fallback = await db.product.findFirst({
        where: { active: true, categoryId: cat.id },
        orderBy: { updatedAt: "desc" },
        select: { images: true },
      });
      imageKey = fallback?.images[0] ?? null;
    }
    const image = (await resolveImage(imageKey)) || FALLBACK_IMAGE;
    slides.push({
      eyebrow: "Shop by category",
      title: `${cat.name}.`,
      copy: `${count} ${pluralize(count, "SKU", "SKUs")} in stock. Wholesale prices, delivery included.`,
      cta: { label: `Shop ${cat.name.toLowerCase()}`, href: `/products?category=${cat.slug}` },
      image,
      tint: slides.length % 2 === 0 ? TINT_A : TINT_B,
    });
  }

  return slides;
}
