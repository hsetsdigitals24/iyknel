"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import { ReviewForm } from "@/components/review-form";

export type OrderReviewItem = {
  productId: string;
  productSlug: string;
  productName: string;
  existingRating?: number;
  existingBody?: string | null;
};

export function OrderReviewPanel({ items }: { items: OrderReviewItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      items
        .filter((i) => typeof i.existingRating === "number")
        .map((i) => [i.productId, i.existingRating as number]),
    ),
  );

  if (items.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <header className="flex items-center gap-2 border-b bg-surface-muted px-5 py-3">
        <Star className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Rate your purchase</h2>
      </header>
      <ul className="divide-y">
        {items.map((item) => {
          const isOpen = openId === item.productId;
          const submitted = reviewed[item.productId];
          return (
            <li key={item.productId} className="px-5 py-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="font-medium hover:underline"
                  >
                    {item.productName}
                  </Link>
                  {typeof submitted === "number" && (
                    <div className="mt-1 flex items-center gap-2">
                      <StarRating value={submitted} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        You rated {submitted} of 5
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isOpen ? "ghost" : "outline"}
                  onClick={() => setOpenId(isOpen ? null : item.productId)}
                >
                  {isOpen ? "Cancel" : submitted ? "Edit" : "Rate"}
                </Button>
              </div>

              {isOpen && (
                <div className="mt-4 rounded-xl border bg-surface-muted/60 p-4">
                  <ReviewForm
                    productId={item.productId}
                    productSlug={item.productSlug}
                    initialRating={submitted ?? item.existingRating ?? 0}
                    initialBody={item.existingBody ?? ""}
                    onSuccess={() => {
                      setReviewed((r) => ({
                        ...r,
                        [item.productId]: r[item.productId] ?? item.existingRating ?? 5,
                      }));
                      setOpenId(null);
                    }}
                    onCancel={() => setOpenId(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
