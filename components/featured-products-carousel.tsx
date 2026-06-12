"use client";

import Autoplay from "embla-carousel-autoplay";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  // CarouselNext,
  // CarouselPrevious,
} from "@/components/ui/carousel";
import { ProductCard } from "@/components/product-card";

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

export function FeaturedProductsCarousel({ products }: { products: FeaturedProduct[] }) {
  if (products.length === 0) return null;
  return (
    <Carousel
      opts={{ align: "start", slidesToScroll: 1, loop: true }}
      plugins={[
        Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
      ]}
      className="relative"
    >
      <CarouselContent>
        {products.map((p) => (
          <CarouselItem
            key={p.id}
            className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
          >
            <ProductCard
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
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* <div className="absolute -bottom-14 right-0 flex items-center gap-2">
        <CarouselPrevious className="static h-9 w-9 translate-y-0 bg-white" />
        <CarouselNext className="static h-9 w-9 translate-y-0 bg-white" />
      </div> */}
    </Carousel>
  );
}
