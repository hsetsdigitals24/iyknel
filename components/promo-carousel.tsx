"use client";

import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export type Slide = {
  eyebrow: string;
  title: string;
  copy: string;
  cta: { label: string; href: string };
  image: string;
  tint: string;
};

export function PromoCarousel({ slides }: { slides: Slide[] }) {
  if (slides.length === 0) return null;
  return (
    <Carousel
      opts={{ loop: true, align: "start" }}
      plugins={[Autoplay({ delay: 5500, stopOnInteraction: true })]}
      className="relative"
    >
      <CarouselContent>
        {slides.map((slide, i) => (
          <CarouselItem key={slide.title}>
            <div
              className="relative overflow-hidden rounded-2xl bg-[#002bd0] text-white"
            >
              <div className="grid items-center gap-6 px-6 py-10 md:grid-cols-2 md:px-12 md:py-16">
                <div className="space-y-4">
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                    {slide.eyebrow}
                  </span>
                  <h2 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                    {slide.title}
                  </h2>
                  <p className="max-w-md text-base text-white/80 md:text-lg">
                    {slide.copy}
                  </p>
                  <div className="pt-2">
                    <Button asChild size="lg" className="rounded-full bg-[#fff] text-black hover:bg-primary/90">
                      <Link href={slide.cta.href}>
                        {slide.cta.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl md:aspect-[5/4]">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 md:px-4">
        <div className="pointer-events-auto">
          <CarouselPrevious className="bg-[#e8d81c] text-black h-10 w-10" />
        </div>
        <div className="pointer-events-auto">
          <CarouselNext className="bg-[#e8d81c] text-black h-10 w-10" />
        </div>
      </div>

      <CarouselDots className="mt-4 " />
    </Carousel>
  );
}
