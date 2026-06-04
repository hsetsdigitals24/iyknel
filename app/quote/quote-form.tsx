"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitQuote, type QuoteState } from "./actions";

const INITIAL: QuoteState = { status: "idle" };

export function QuoteForm() {
  const [state, action] = useFormState(submitQuote, INITIAL);
  const last = useRef<QuoteState>(INITIAL);

  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

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
        <Field label="Business name" name="businessName" />
        <Field label="Contact person" name="contactName" />
        <Field label="Email" name="email" type="email" />
        <Field label="Phone" name="phone" type="tel" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">What do you need?</Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us product categories, quantities, delivery area…"
        />
      </div>
      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} />
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
