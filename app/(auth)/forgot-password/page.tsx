import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your registered phone number. We&apos;ll send a reset code by SMS.
        </p>
      </div>
      <ForgotForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
