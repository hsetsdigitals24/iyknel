"use client";

import { Heart } from "lucide-react";

export function WishlistHeartButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="Add to wishlist"
      className={
        className ??
        "absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-muted-foreground shadow opacity-0 transition group-hover:opacity-100 hover:text-deal"
      }
      onClick={(e) => {
        // Wishlist toggle wires up on /wishlist-capable pages; harmless no-op elsewhere.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Heart className="h-4 w-4" />
    </button>
  );
}
