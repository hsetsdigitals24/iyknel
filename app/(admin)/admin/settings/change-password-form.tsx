"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FormStateToast } from "@/components/form-state-toast";
import { changePassword } from "./actions";

export function ChangePasswordForm() {
  const [state, action] = useFormState(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          autoComplete="new-password"
          aria-invalid={!!fieldErrors?.newPassword?.[0]}
        />
        {fieldErrors?.newPassword?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.newPassword[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          autoComplete="new-password"
          aria-invalid={!!fieldErrors?.confirmPassword?.[0]}
        />
        {fieldErrors?.confirmPassword?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword[0]}</p>
        )}
      </div>
      <FormStateToast state={state} />
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
