"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitQuote, type QuoteState } from "./actions";

const INITIAL: QuoteState = { status: "idle" };

export function QuoteForm() {
  const [state, action] = useFormState(submitQuote, INITIAL);

  if (state.status === "ok") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <h2 className="font-serif text-2xl font-semibold">Got it.</h2>
        <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-6 md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Business name" name="businessName" error={state.fieldErrors?.businessName} />
        <Field label="Contact person" name="contactName" error={state.fieldErrors?.contactName} />
        <Field label="Email" name="email" type="email" error={state.fieldErrors?.email} />
        <Field label="Phone" name="phone" type="tel" error={state.fieldErrors?.phone} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">What do you need?</Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us product categories, quantities, delivery area…"
          aria-invalid={!!state.fieldErrors?.message}
        />
        {state.fieldErrors?.message && (
          <p className="text-xs text-destructive">{state.fieldErrors.message}</p>
        )}
      </div>
      {state.status === "error" && state.message && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full rounded-full" disabled={pending}>
      {pending ? "Sending…" : "Send quote request"}
    </Button>
  );
}
