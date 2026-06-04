"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/review-form";
import { dismissReviewPromptAction } from "@/app/(customer)/reviews/actions";

export type PendingPromptItem = {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  orderNumber: string;
};

export function ReviewPromptDialog({ pending }: { pending: PendingPromptItem[] }) {
  const queue = useMemo(() => pending, [pending]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(queue.length > 0);
  const [, startDismiss] = useTransition();

  if (queue.length === 0) return null;
  const current = queue[index];
  if (!current) return null;

  function next() {
    if (index + 1 >= queue.length) {
      setOpen(false);
    } else {
      setIndex(index + 1);
    }
  }

  function skip() {
    startDismiss(async () => {
      await dismissReviewPromptAction([current.productId]);
      next();
    });
  }

  function skipAll() {
    startDismiss(async () => {
      await dismissReviewPromptAction(queue.map((q) => q.productId));
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How was your delivery?</DialogTitle>
          <DialogDescription>
            Order {current.orderNumber} was delivered. Your testimonial helps other businesses
            buy with confidence.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border bg-surface-muted p-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-background">
            <Image
              src={current.productImage || "/placeholders/product.svg"}
              alt={current.productName}
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{current.productName}</p>
            {queue.length > 1 && (
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {index + 1} of {queue.length} pending
              </p>
            )}
          </div>
        </div>

        <ReviewForm
          productId={current.productId}
          productSlug={current.productSlug}
          onSuccess={next}
          onCancel={skip}
          cancelLabel="Skip for now"
        />

        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={skipAll}
            className="text-xs text-muted-foreground"
          >
            Don&rsquo;t ask again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
