"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZE_CLASS = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

type StarRatingProps = {
  value: number;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export function StarRating({ value, size = "md", className }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;
  return (
    <span
      className={cn("relative inline-flex", className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      <span className="inline-flex text-muted-foreground/40">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={cn(SIZE_CLASS[size], "fill-muted-foreground/20")} />
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-primary"
        style={{ width: `${pct}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={cn(SIZE_CLASS[size], "fill-primary shrink-0")} />
        ))}
      </span>
    </span>
  );
}

type StarPickerProps = {
  value: number;
  onChange: (v: number) => void;
  size?: keyof typeof SIZE_CLASS;
  name?: string;
};

export function StarPicker({ value, onChange, size = "lg", name }: StarPickerProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= shown;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            className="rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                SIZE_CLASS[size],
                active ? "fill-primary text-primary" : "text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
      {name && <input type="hidden" name={name} value={value || ""} />}
    </div>
  );
}
