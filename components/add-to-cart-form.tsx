"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { addToCartAction } from "@/app/(customer)/cart/actions";

type Props = {
  productId: string;
  unitsPerCarton: number | null;
  stockCartons: number;
  stockLoosePacks: number;
  priceKobo: number;
  className?: string;
};

export function AddToCartForm({
  productId,
  unitsPerCarton,
  stockCartons,
  stockLoosePacks,
  priceKobo,
  className,
}: Props) {
  const router = useRouter();
  const { status } = useSession();
  const [pending, start] = useTransition();
  const [cartons, setCartons] = useState(0);
  const [packs, setPacks] = useState(unitsPerCarton ? 0 : Math.min(1, stockLoosePacks));

  const canCartons = unitsPerCarton != null;
  const totalPacks = cartons * (unitsPerCarton ?? 0) + packs;
  const lineTotalKobo = totalPacks * priceKobo;
  const noStock = stockCartons === 0 && stockLoosePacks === 0;

  function clampCartons(n: number) {
    return Math.max(0, Math.min(n, stockCartons));
  }
  function clampPacks(n: number) {
    return Math.max(0, Math.min(n, stockLoosePacks));
  }

  function onAdd() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (totalPacks <= 0) {
      toast.error("Pick at least one carton or pack.");
      return;
    }
    start(async () => {
      const res = await addToCartAction(productId, { cartons, packs });
      if (!res.ok) toast.error(res.message);
      else {
        toast.success("Added to cart");
        setCartons(0);
        setPacks(0);
      }
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {canCartons && (
          <Stepper
            label="Cartons"
            value={cartons}
            onChange={(n) => setCartons(clampCartons(n))}
            max={stockCartons}
            disabled={stockCartons === 0}
            helper={
              stockCartons === 0
                ? "No cartons in stock"
                : `${stockCartons} carton${stockCartons === 1 ? "" : "s"} available`
            }
          />
        )}
        <Stepper
          label="Packs"
          value={packs}
          onChange={(n) => setPacks(clampPacks(n))}
          max={stockLoosePacks}
          disabled={stockLoosePacks === 0}
          helper={
            stockLoosePacks === 0
              ? canCartons
                ? "No loose packs — buy by carton"
                : "Out of stock"
              : `${stockLoosePacks} pack${stockLoosePacks === 1 ? "" : "s"} available`
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3 text-sm">
        <div className="text-muted-foreground">
          {canCartons && (
            <>
              <span className="font-medium text-foreground">1 carton = {unitsPerCarton} packs</span>
              <span className="mx-2">·</span>
            </>
          )}
          <span>
            Total: <span className="font-semibold text-foreground">{totalPacks} packs</span>
          </span>
        </div>
        <div className="text-base font-bold tabular-nums text-primary">
          {formatNaira(lineTotalKobo)}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-4 w-full rounded-full sm:w-auto sm:px-8"
        disabled={pending || noStock || totalPacks <= 0}
        onClick={onAdd}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {pending ? "Adding…" : noStock ? "Out of stock" : "Add to cart"}
      </Button>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  max,
  disabled,
  helper,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
  disabled?: boolean;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="inline-flex items-center rounded-full border bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          disabled={disabled || value <= 0}
          onClick={() => onChange(value - 1)}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.currentTarget.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-12 bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}
