"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStateToast } from "@/components/form-state-toast";
import { registerBusiness } from "./actions";

export function RegisterForm() {
  const [state, action] = useFormState(registerBusiness, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <Field
        id="businessName"
        label="Business name"
        error={fieldErrors?.businessName?.[0]}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Field id="rcNumber" label="RC number" error={fieldErrors?.rcNumber?.[0]} />
        <Field
          id="contactName"
          label="Contact person"
          error={fieldErrors?.contactName?.[0]}
          required
        />
      </div>
      <Field
        id="email"
        type="email"
        label="Email"
        autoComplete="email"
        error={fieldErrors?.email?.[0]}
        required
      />
      <Field
        id="phone"
        type="tel"
        label="Phone"
        autoComplete="tel"
        error={fieldErrors?.phone?.[0]}
        required
      />
      <Field
        id="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        error={fieldErrors?.password?.[0]}
        required
      />
      <div className="space-y-1.5">
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="consent"
            className="mt-0.5 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={!!fieldErrors?.consent?.[0]}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline" target="_blank">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline" target="_blank">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
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
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} aria-invalid={!!error} {...rest} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}
