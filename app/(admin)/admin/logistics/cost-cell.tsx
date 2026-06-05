"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";

type Props = {
  vehicleId: string;
  distanceBandId: string;
  defaultValue: string;
  action: (formData: FormData) => Promise<void>;
};

export function CostCell({ vehicleId, distanceBandId, defaultValue, action }: Props) {
  const [justSaved, setJustSaved] = useState(false);

  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="distanceBandId" value={distanceBandId} />
      <input
        type="number"
        name="costNaira"
        step="0.01"
        min={0}
        defaultValue={defaultValue}
        className="h-8 w-28 rounded border border-input bg-transparent px-2 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <StatusIndicator justSaved={justSaved} setJustSaved={setJustSaved} />
    </form>
  );
}

function StatusIndicator({
  justSaved,
  setJustSaved,
}: {
  justSaved: boolean;
  setJustSaved: (v: boolean) => void;
}) {
  const { pending } = useFormStatus();
  const prevPending = useRef(false);

  useEffect(() => {
    if (prevPending.current && !pending) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1500);
      return () => clearTimeout(t);
    }
    prevPending.current = pending;
  }, [pending, setJustSaved]);

  return (
    <span className="inline-flex h-4 w-4 items-center justify-center">
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : justSaved ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : null}
    </span>
  );
}
