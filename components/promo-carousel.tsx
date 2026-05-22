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

type Slide = {
  eyebrow: string;
  title: string;
  copy: string;
  cta: { label: string; href: string };
  image: string;
  tint: string; // tailwind gradient classes for background
};

const SLIDES: Slide[] = [
  {
    eyebrow: "Bulk rice deals",
    title: "Stock the shelves. Save the run.",
    copy: "5kg, 10kg and 25kg bags from Mama Gold, Royal Stallion and Caprice — wholesale prices, doorstep delivery.",
    cta: { label: "Shop rice & grains", href: "/products?category=pasta-grains" },
    image: "https://source.unsplash.com/featured/1600x900/?rice,bag,grain",
    tint: "from-amber-100 via-amber-50 to-background",
  },
  {
    eyebrow: "New arrivals",
    title: "Baby care, restocked.",
    copy: "Pampers, Huggies, Cussons, Johnson's — everything for the nursery shelf in one order.",
    cta: { label: "Browse baby care", href: "/products?category=baby-care" },
    image: "https://source.unsplash.com/featured/1600x900/?baby,diaper,care",
    tint: "from-pink-100 via-pink-50 to-background",
  },
  {
    eyebrow: "Same-day Lagos",
    title: "Office essentials, on demand.",
    copy: "Pens, paper, files, calculators — order before noon, delivered same day across Lagos mainland.",
    cta: { label: "Shop office & stationery", href: "/products?category=office-stationery" },
    image: "https://source.unsplash.com/featured/1600x900/?office,stationery,paper",
    tint: "from-sky-100 via-sky-50 to-background",
  },
  {
    eyebrow: "Restock Mondays",
    title: "Free logistics over ₦200,000.",
    copy: "Weekly restock orders qualify for waived logistics — let us pick the right vehicle for your route.",
    cta: { label: "Open a wholesale account", href: "/register" },
    image: "https://source.unsplash.com/featured/1600x900/?delivery,truck,warehouse",
    tint: "from-emerald-100 via-emerald-50 to-background",
  },
  {
    eyebrow: "Household clean-up",
    title: "Cartons of Omo, Hypo & Harpic.",
    copy: "Refresh shop inventory with detergents, bleach and cleaners from one wholesale invoice.",
    cta: { label: "Shop household", href: "/products?category=household" },
    image: "https://source.unsplash.com/featured/1600x900/?cleaning,detergent,laundry",
    tint: "from-blue-100 via-blue-50 to-background",
  },
];

export function PromoCarousel() {
  return (
    <Carousel
      opts={{ loop: true, align: "start" }}
      plugins={[Autoplay({ delay: 5500, stopOnInteraction: true })]}
      className="relative"
    >
      <CarouselContent>
        {SLIDES.map((slide, i) => (
          <CarouselItem key={slide.title}>
            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${slide.tint}`}
            >
              <div className="grid items-center gap-6 px-6 py-10 md:grid-cols-2 md:px-12 md:py-16">
                <div className="space-y-4">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    {slide.eyebrow}
                  </span>
                  <h2 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                    {slide.title}
                  </h2>
                  <p className="max-w-md text-base text-muted-foreground md:text-lg">
                    {slide.copy}
                  </p>
                  <div className="pt-2">
                    <Button asChild size="lg" className="rounded-full">
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
          <CarouselPrevious className="h-10 w-10" />
        </div>
        <div className="pointer-events-auto">
          <CarouselNext className="h-10 w-10" />
        </div>
      </div>

      <CarouselDots className="mt-4" />
    </Carousel>
  );
}
