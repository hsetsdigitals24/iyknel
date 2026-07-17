"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/validation";

type Props = {
  productId: string;
  stockCartons: number;
  stockLoosePacks: number;
  unitsPerCarton: number | null;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

const INITIAL: FormState = { ok: true };

export function StockCell({
  productId,
  stockCartons,
  stockLoosePacks,
  unitsPerCarton,
  action,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useFormState(action, INITIAL);

  // Close the editor and surface errors when the action resolves.
  const lastHandled = useRef<FormState>(INITIAL);
  useEffect(() => {
    if (state === lastHandled.current) return;
    lastHandled.current = state;
    if (!state) return;
    if (state.ok) {
      setEditing(false);
      if (state.message) toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="tabular-nums">
          {unitsPerCarton != null ? (
            <span className="inline-flex flex-col items-end leading-tight">
              <span>
                {stockCartons}c + {stockLoosePacks}p
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {stockCartons * unitsPerCarton + stockLoosePacks} packs
              </span>
            </span>
          ) : (
            <>{stockLoosePacks} packs</>
          )}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Edit stock"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex items-center justify-end gap-1.5">
      {unitsPerCarton != null && (
        <label className="inline-flex items-center gap-1">
          <input
            type="number"
            name="stockCartons"
            min={0}
            step={1}
            defaultValue={stockCartons}
            aria-label="Cartons"
            className="h-8 w-16 rounded border border-input bg-transparent px-2 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">c</span>
        </label>
      )}
      <label className="inline-flex items-center gap-1">
        <input
          type="number"
          name="stockLoosePacks"
          min={0}
          step={1}
          defaultValue={stockLoosePacks}
          aria-label="Loose packs"
          className="h-8 w-16 rounded border border-input bg-transparent px-2 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">p</span>
      </label>
      <SaveButton />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8"
        onClick={() => setEditing(false)}
      >
        Cancel
      </Button>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="h-8" disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
      Save
    </Button>
  );
}
