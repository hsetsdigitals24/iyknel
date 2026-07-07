"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { removeItemAction, updateQtyAction } from "@/app/(customer)/cart/actions";
import type { CartLine as Line } from "@/lib/cart";

export function CartLineRow({ line }: { line: Line }) {
  const [pending, start] = useTransition();
  const canCartons = line.unitsPerCarton != null;

  function setQty(next: { cartons: number; packs: number }) {
    start(async () => {
      const res = await updateQtyAction(line.itemId, next);
      if (!res.ok) toast.error(res.message);
    });
  }
  function bumpCartons(delta: number) {
    const target = Math.max(0, Math.min(line.stockCartons, line.quantityCartons + delta));
    setQty({ cartons: target, packs: line.quantityPacks });
  }
  function bumpPacks(delta: number) {
    const target = Math.max(0, Math.min(line.stockLoosePacks, line.quantityPacks + delta));
    setQty({ cartons: line.quantityCartons, packs: target });
  }
  function remove() {
    start(async () => {
      await removeItemAction(line.itemId);
    });
  }

  return (
    <div className="flex gap-4 p-4 sm:p-5">
      <Link
        href={`/products/${line.slug}`}
        className="relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-surface-muted"
      >
        {line.image ? (
          <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={`/products/${line.slug}`}
              className="line-clamp-2 font-medium leading-snug hover:underline"
            >
              {line.name}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatNaira(line.unitPriceKobo)} per pack
              {canCartons && <> · 1 carton = {line.unitsPerCarton} packs</>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canCartons && (
                <>
                  {line.quantityCartons} carton{line.quantityCartons === 1 ? "" : "s"} +{" "}
                </>
              )}
              {line.quantityPacks} pack{line.quantityPacks === 1 ? "" : "s"}
              {" · "}
              <span className="font-medium text-foreground">{line.totalPacks} packs total</span>
            </p>
          </div>
          <p className="shrink-0 text-base font-bold tabular-nums text-primary">
            {formatNaira(line.lineSubtotalKobo)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {canCartons && (
              <StepperGroup
                label="Cartons"
                value={line.quantityCartons}
                onDec={() => bumpCartons(-1)}
                onInc={() => bumpCartons(1)}
                disabled={pending}
                canDec={line.quantityCartons > 0}
                canInc={line.quantityCartons < line.stockCartons}
              />
            )}
            <StepperGroup
              label="Packs"
              value={line.quantityPacks}
              onDec={() => bumpPacks(-1)}
              onInc={() => bumpPacks(1)}
              disabled={pending}
              canDec={line.quantityPacks > 0}
              canInc={line.quantityPacks < line.stockLoosePacks}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={remove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepperGroup({
  label,
  value,
  onDec,
  onInc,
  disabled,
  canDec,
  canInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="inline-flex items-center rounded-full border bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={disabled || !canDec}
          onClick={onDec}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="min-w-[1.75rem] px-1 text-center text-xs font-medium tabular-nums">
          {value}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={disabled || !canInc}
          onClick={onInc}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
