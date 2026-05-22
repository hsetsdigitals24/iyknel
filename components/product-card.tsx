import Image from "next/image";
import Link from "next/link";
import { formatNaira } from "@/lib/utils";
import { WishlistHeartButton } from "@/components/wishlist-heart-button";

type Props = {
  slug: string;
  name: string;
  priceKobo: number;
  image?: string;
  category?: string | null;
  badge?: "deal" | "new" | "bestseller" | null;
  stock?: number;
};

export function ProductCard({ slug, name, priceKobo, image, category, badge, stock }: Props) {
  const lowStock = typeof stock === "number" && stock > 0 && stock < 20;
  const outOfStock = typeof stock === "number" && stock <= 0;

  return (
    <Link
      href={`/products/${slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-muted-foreground">
            No image
          </div>
        )}

        {badge === "deal" && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-deal px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-deal-foreground shadow">
            Deal
          </span>
        )}
        {badge === "new" && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-info px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info-foreground shadow">
            New
          </span>
        )}
        {badge === "bestseller" && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow">
            Bestseller
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-destructive/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive-foreground shadow">
            Out of stock
          </span>
        )}

        <WishlistHeartButton />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {category && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{name}</h3>
        <div className="mt-auto flex items-baseline justify-between pt-2">
          <p className="text-base font-bold tabular-nums text-primary">{formatNaira(priceKobo)}</p>
          {lowStock && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
              Low stock
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
