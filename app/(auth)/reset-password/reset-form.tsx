"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FormStateToast } from "@/components/form-state-toast";
import { resetPassword } from "./actions";

export function ResetForm() {
  const search = useSearchParams();
  const emailFromQuery = search.get("email") ?? "";
  const [state, action] = useFormState(resetPassword, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={emailFromQuery}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">Reset code</Label>
        <Input id="code" name="code" inputMode="numeric" maxLength={6} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="new-password"
        />
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
