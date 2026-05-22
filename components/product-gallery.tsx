"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const safe = images.length > 0 ? images : [""];
  const current = safe[active] ?? "";

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border bg-surface-muted">
        {current ? (
          <Image
            src={current}
            alt={alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        )}
      </div>

      {safe.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {safe.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-surface-muted transition",
                i === active ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/40",
              )}
            >
              {url ? (
                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
