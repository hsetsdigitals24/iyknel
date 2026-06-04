"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleWishlistAction } from "@/app/(customer)/wishlist/actions";

type Props = {
  productId: string;
  initialActive?: boolean;
  className?: string;
};

export function WishlistHeartButton({ productId, initialActive = false, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const [active, setActive] = useState(initialActive);
  const [pending, start] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      toast("Sign in to save items", {
        action: {
          label: "Sign in",
          onClick: () =>
            router.push(`/login?callbackUrl=${encodeURIComponent(pathname ?? "/products")}`),
        },
      });
      return;
    }
    start(async () => {
      const res = await toggleWishlistAction(productId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setActive(res.inWishlist);
      toast.success(res.inWishlist ? "Saved to wishlist" : "Removed from wishlist");
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow transition disabled:opacity-60",
        active
          ? "text-primary opacity-100"
          : "text-muted-foreground opacity-100 hover:text-primary md:opacity-0 md:group-hover:opacity-100",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", active && "fill-primary")} />
    </button>
  );
}
