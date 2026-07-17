"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStateToast } from "@/components/form-state-toast";
import { updateBankDetailsAction } from "./actions";

export function BankDetailsForm({
  initial,
}: {
  initial: { bankName: string; bankAccountName: string; bankAccountNumber: string };
}) {
  const [state, action] = useFormState(updateBankDetailsAction, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bankName">Bank name</Label>
        <Input
          id="bankName"
          name="bankName"
          required
          defaultValue={initial.bankName}
          aria-invalid={!!fieldErrors?.bankName?.[0]}
        />
        {fieldErrors?.bankName?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.bankName[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccountName">Account name</Label>
        <Input
          id="bankAccountName"
          name="bankAccountName"
          required
          defaultValue={initial.bankAccountName}
          aria-invalid={!!fieldErrors?.bankAccountName?.[0]}
        />
        {fieldErrors?.bankAccountName?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.bankAccountName[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccountNumber">Account number</Label>
        <Input
          id="bankAccountNumber"
          name="bankAccountNumber"
          inputMode="numeric"
          required
          defaultValue={initial.bankAccountNumber}
          aria-invalid={!!fieldErrors?.bankAccountNumber?.[0]}
        />
        {fieldErrors?.bankAccountNumber?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.bankAccountNumber[0]}</p>
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
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}
