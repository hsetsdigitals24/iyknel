"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "./actions";

export function ResetForm() {
  const search = useSearchParams();
  const phoneFromQuery = search.get("phone") ?? "";
  const [state, action] = useFormState(resetPassword, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          required
          defaultValue={phoneFromQuery}
          autoComplete="tel"
        />
        {fieldErrors?.phone?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.phone[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">Reset code</Label>
        <Input id="code" name="code" inputMode="numeric" maxLength={6} required />
        {fieldErrors?.code?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.code[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
        {fieldErrors?.password?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
        )}
      </div>
      {state && !state.ok && !fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Updating…" : "Update password"}
    </Button>
  );
}
