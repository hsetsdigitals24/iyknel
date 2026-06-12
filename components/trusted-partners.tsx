"use client";

import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";

import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { WhyIyknel } from "./why-iyknel";

// Trusted partners / brands wall. Static brand logos live in /public/partners
// (site chrome, not product images). Add more by dropping a file in that folder
// and appending it here.
type Partner = { name: string; logo: string };

const DEFAULT_PARTNERS: Partner[] = [
  { name: "Ayoola Foods", logo: "/partners/Ayoola_Foods_BW-150x150.png" },
  { name: "Dangote", logo: "/partners/Dangote_BW-150x150.png" },
  { name: "Dano", logo: "/partners/Dano_BW-150x150.png" },
  { name: "Golden Penny", logo: "/partners/Golden_Penny_BW-150x150.png" },
  { name: "Grand Cereals", logo: "/partners/Grand.png" },
];

export function TrustedPartners({
  partners = DEFAULT_PARTNERS,
  className,
}: {
  partners?: Partner[];
  className?: string;
}) {
  if (partners.length === 0) return null;
  // embla only loops when there are more slides than fit on screen; with 5 logos
  // and up to 5 visible, repeat the set so it can scroll continuously.
  const slides = Array.from({ length: 3 }, () => partners).flat();
  return (
    <section className={className ?? "bg-white"}>
      <div className="container py-12 md:py-16">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Trusted partners
          </span>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            Stocked by the businesses we serve.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Wholesalers, supermarkets and retailers across Lagos restock with Iyknel.
          </p>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: true })]}
        >
          <CarouselContent>
            {slides.map((p, i) => (
              <CarouselItem
                key={`${p.name}-${i}`}
                className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
              >
                <div className="flex h-24 items-center justify-center bg-card p-4">
                  <div className="relative h-full w-full">
                    <Image
                      src={p.logo}
                      alt={p.name}
                      fill
                      sizes="(min-width: 1024px) 20vw, 50vw"
                      className="object-contain opacity-80 transition hover:opacity-100"
                    />,
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
      <WhyIyknel />
    </section>
  );
}
