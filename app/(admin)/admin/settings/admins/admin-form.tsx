"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormStateToast } from "@/components/form-state-toast";
import type { FormState } from "@/lib/validation";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS, type AdminRole } from "@/lib/permissions";

export type AdminFormData = {
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
};

export function AdminForm({
  mode,
  initial,
  action,
}: {
  mode: "create" | "edit";
  initial?: AdminFormData;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useFormState(action, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          autoComplete="off"
          aria-invalid={!!fieldErrors?.name?.[0]}
        />
        {fieldErrors?.name?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={initial?.email}
          autoComplete="off"
          aria-invalid={!!fieldErrors?.email?.[0]}
        />
        {fieldErrors?.email?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial?.phone}
          autoComplete="off"
          aria-invalid={!!fieldErrors?.phone?.[0]}
        />
        {fieldErrors?.phone?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.phone[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" defaultValue={initial?.role ?? "MANAGER"}>
          <SelectTrigger id="role" aria-invalid={!!fieldErrors?.role?.[0]}>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {ADMIN_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ADMIN_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors?.role?.[0] && (
          <p className="text-xs text-destructive">{fieldErrors.role[0]}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Super Admins manage other admins and site settings. Managers run the full
          shop; Staff handle orders &amp; customers; Catalog manages products &amp;
          inventory.
        </p>
      </div>

      {mode === "create" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              aria-invalid={!!fieldErrors?.password?.[0]}
            />
            {fieldErrors?.password?.[0] && (
              <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
              aria-invalid={!!fieldErrors?.confirmPassword?.[0]}
            />
            {fieldErrors?.confirmPassword?.[0] && (
              <p className="text-xs text-destructive">
                {fieldErrors.confirmPassword[0]}
              </p>
            )}
          </div>
        </>
      ) : (
        <fieldset className="space-y-4 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">
            Reset password (optional)
          </legend>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              aria-invalid={!!fieldErrors?.newPassword?.[0]}
            />
            {fieldErrors?.newPassword?.[0] && (
              <p className="text-xs text-destructive">
                {fieldErrors.newPassword[0]}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current password.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              aria-invalid={!!fieldErrors?.confirmPassword?.[0]}
            />
            {fieldErrors?.confirmPassword?.[0] && (
              <p className="text-xs text-destructive">
                {fieldErrors.confirmPassword[0]}
              </p>
            )}
          </div>
        </fieldset>
      )}

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
          ? "Create admin"
          : "Save changes"}
    </Button>
  );
}
