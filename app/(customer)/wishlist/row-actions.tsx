"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moveToCartAction, removeFromWishlistAction } from "./actions";

export function WishlistRowActions({ productId }: { productId: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await moveToCartAction(productId);
            if (!res.ok) toast.error(res.message);
            else toast.success("Added to cart");
          })
        }
      >
        Move to cart
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => start(() => removeFromWishlistAction(productId).then(() => undefined))}
      >
        Remove
      </Button>
    </div>
  );
}
