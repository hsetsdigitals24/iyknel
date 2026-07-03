"use client";

import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BLUR_DATA_URL } from "@/lib/image-placeholder";
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
            <div className="relative h-[58vh] min-h-[380px] overflow-hidden text-white">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority={i === 0}
                sizes="100vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover"
              />
              {/* Dark overlay for legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />

              <div className="relative flex h-full flex-col justify-center py-10 md:py-16">
                <div className="container">
                  <div className="max-w-xl space-y-4">
                  <span className="inline-flex bg-[#ffc300] items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 backdrop-blur">
                    {slide.eyebrow}
                  </span>
                  <h2 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                    {slide.title}
                  </h2>
                  <p className="max-w-md text-base text-white/85 md:text-lg">
                    {slide.copy}
                  </p>
                  <div className="">
                    <Button asChild size="lg" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Link href={slide.cta.href}>
                        {slide.cta.label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center">
        <div className="container flex w-full items-center justify-between">
          <div className="pointer-events-auto hidden md:block">
            <CarouselPrevious className="bg-secondary text-secondary-foreground h-10 w-10" />
          </div>
          <div className="pointer-events-auto hidden md:block">
            <CarouselNext className="bg-secondary text-secondary-foreground h-10 w-10" />
          </div>
        </div>
      </div> */}

      <CarouselDots className="mt-4 " />
    </Carousel>
  );
}
