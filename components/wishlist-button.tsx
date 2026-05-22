"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToWishlistAction } from "@/app/(customer)/wishlist/actions";

export function WishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const { status } = useSession();
  const [pending, start] = useTransition();

  function onClick() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    start(async () => {
      const res = await addToWishlistAction(productId);
      if (!res.ok) toast.error(res.message);
      else toast.success("Saved to wishlist");
    });
  }

  return (
    <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onClick}>
      {pending ? "Saving…" : "Add to wishlist"}
    </Button>
  );
}
