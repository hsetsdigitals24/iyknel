import Link from "next/link";
import { Suspense } from "react";
import { ResetForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code we sent to your email, and choose a new password.
        </p>
      </div>
      <Suspense>
        <ResetForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
