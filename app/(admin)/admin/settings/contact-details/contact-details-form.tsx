"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormStateToast } from "@/components/form-state-toast";
import { updateContactDetailsAction } from "./actions";

export function ContactDetailsForm({
  initial,
}: {
  initial: {
    contactEmail: string;
    contactPhones: string;
    contactAddressLine1: string;
    contactAddressLine2: string;
    contactAddressLga: string;
    contactAddressState: string;
  };
}) {
  const [state, action] = useFormState(updateContactDetailsAction, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          defaultValue={initial.contactEmail}
          aria-invalid={!!fieldErrors?.contactEmail?.[0]}
        />
        {fieldErrors?.contactEmail?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.contactEmail[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactPhones">Phone number(s)</Label>
        <Input
          id="contactPhones"
          name="contactPhones"
          required
          defaultValue={initial.contactPhones}
          aria-invalid={!!fieldErrors?.contactPhones?.[0]}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple numbers with a comma.
        </p>
        {fieldErrors?.contactPhones?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.contactPhones[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactAddressLine1">Address line 1</Label>
        <Input
          id="contactAddressLine1"
          name="contactAddressLine1"
          required
          defaultValue={initial.contactAddressLine1}
          aria-invalid={!!fieldErrors?.contactAddressLine1?.[0]}
        />
        {fieldErrors?.contactAddressLine1?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.contactAddressLine1[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactAddressLine2">Address line 2</Label>
        <Input
          id="contactAddressLine2"
          name="contactAddressLine2"
          defaultValue={initial.contactAddressLine2}
          aria-invalid={!!fieldErrors?.contactAddressLine2?.[0]}
        />
        {fieldErrors?.contactAddressLine2?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.contactAddressLine2[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactAddressLga">LGA</Label>
        <Input
          id="contactAddressLga"
          name="contactAddressLga"
          required
          defaultValue={initial.contactAddressLga}
          aria-invalid={!!fieldErrors?.contactAddressLga?.[0]}
        />
        {fieldErrors?.contactAddressLga?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.contactAddressLga[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactAddressState">State</Label>
        <Input
          id="contactAddressState"
          name="contactAddressState"
          required
          defaultValue={initial.contactAddressState}
          aria-invalid={!!fieldErrors?.contactAddressState?.[0]}
        />
        {fieldErrors?.contactAddressState?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.contactAddressState[0]}</p>
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
