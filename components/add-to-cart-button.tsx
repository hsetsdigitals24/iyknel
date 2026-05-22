"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/app/(customer)/cart/actions";

type Props = {
  productId: string;
  disabled?: boolean;
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function AddToCartButton({ productId, disabled, size = "lg", className }: Props) {
  const router = useRouter();
  const { status } = useSession();
  const [pending, start] = useTransition();

  function onClick() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    start(async () => {
      const res = await addToCartAction(productId, { cartons: 0, pieces: 1 });
      if (!res.ok) toast.error(res.message);
      else toast.success("Added to cart");
    });
  }

  return (
    <Button
      type="button"
      size={size}
      disabled={disabled || pending}
      onClick={onClick}
      className={className}
    >
      {pending ? "Adding…" : "Add to cart"}
    </Button>
  );
}
