"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, action] = useFormState(requestPasswordReset, null);
  const err = state && !state.ok ? state.fieldErrors?.phone?.[0] ?? state.message : null;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" required autoComplete="tel" />
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send reset code"}
    </Button>
  );
}
