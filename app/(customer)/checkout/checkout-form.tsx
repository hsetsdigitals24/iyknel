"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormStateToast } from "@/components/form-state-toast";
import { submitOrderAction } from "./actions";

type Address = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
};

export function CheckoutForm({ addresses }: { addresses: Address[] }) {
  const [state, action] = useFormState(submitOrderAction, null);
  const [mode, setMode] = useState<"existing" | "new">(addresses.length > 0 ? "existing" : "new");
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="addressMode" value={mode} />

      {addresses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg">Delivery address</h3>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "existing" ? "new" : "existing")}
            >
              {mode === "existing" ? "Use new address" : "Pick saved address"}
            </button>
          </div>

          {mode === "existing" && (
            <div className="space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-secondary/40"
                >
                  <input
                    type="radio"
                    name="addressId"
                    value={a.id}
                    defaultChecked={a.id === addresses[0].id}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <div>{a.line1}</div>
                    {a.line2 && <div className="text-muted-foreground">{a.line2}</div>}
                    <div className="text-muted-foreground">
                      {a.city}, {a.state}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "new" && (
        <div className="space-y-3">
          <h3 className="font-serif text-lg">New delivery address</h3>
          <Field id="line1" label="Address line 1" error={fieldErrors?.line1?.[0]} required />
          <Field id="line2" label="Address line 2 (optional)" error={fieldErrors?.line2?.[0]} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" label="City" error={fieldErrors?.city?.[0]} required />
            <Field id="state" label="State" error={fieldErrors?.state?.[0]} required />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes for the back office (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} maxLength={1000} />
      </div>

      <FormStateToast state={state} />
      <SubmitButton />
    </form>
  );
}

function Field({
  id,
  label,
  error,
  required,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} required={required} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Submitting…" : "Submit order"}
    </Button>
  );
}
