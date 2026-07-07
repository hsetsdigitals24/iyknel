"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStateToast } from "@/components/form-state-toast";
import type { FormState } from "@/lib/validation";

export type WhatsappContactFormData = {
  label: string;
  phone: string;
  sortOrder: number;
  active: boolean;
};

export function WhatsappContactForm({
  mode,
  initial,
  action,
}: {
  mode: "create" | "edit";
  initial?: WhatsappContactFormData;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useFormState(action, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          name="label"
          required
          defaultValue={initial?.label}
          placeholder="e.g. Sales, Order support"
          autoComplete="off"
          aria-invalid={!!fieldErrors?.label?.[0]}
        />
        {fieldErrors?.label?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.label[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          required
          defaultValue={initial?.phone}
          placeholder="e.g. 08012345678 or +2348012345678"
          autoComplete="off"
          aria-invalid={!!fieldErrors?.phone?.[0]}
        />
        {fieldErrors?.phone?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.phone[0]}</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            required
            defaultValue={initial?.sortOrder ?? 100}
            aria-invalid={!!fieldErrors?.sortOrder?.[0]}
          />
          {fieldErrors?.sortOrder?.[0] && (
            <p className="text-xs text-destructive">{fieldErrors.sortOrder[0]}</p>
          )}
        </div>
        <label className="mt-7 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-4 w-4 rounded border-input"
          />
          Shown on the chat button
        </label>
      </div>

      <FormStateToast state={state} />
      <SubmitButton mode={mode} />
    </form>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending
        ? "Saving…"
        : mode === "create"
          ? "Add contact"
          : "Save changes"}
    </Button>
  );
}
