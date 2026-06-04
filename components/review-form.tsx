"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarPicker } from "@/components/star-rating";
import { submitReviewAction } from "@/app/(customer)/reviews/actions";

type Props = {
  productId: string;
  productSlug: string;
  initialRating?: number;
  initialBody?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
};

export function ReviewForm({
  productId,
  productSlug,
  initialRating = 0,
  initialBody = "",
  onSuccess,
  onCancel,
  cancelLabel = "Cancel",
}: Props) {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState(initialBody ?? "");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Pick a rating between 1 and 5 stars.");
      return;
    }
    start(async () => {
      const res = await submitReviewAction(productId, productSlug, rating, body);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Thanks for the review!");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Your rating</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="review-body" className="text-sm font-medium">
          Testimonial <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="review-body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did your team think of this product?"
          maxLength={1000}
        />
        <p className="text-right text-[10px] text-muted-foreground">{body.length}/1000</p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={pending} className="rounded-full">
          {pending ? "Saving…" : "Submit review"}
        </Button>
      </div>
    </form>
  );
}
