"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function friendlySignInError(code: string | undefined | null): string {
  if (!code) return "Couldn't sign you in. Please try again.";
  if (code === "CredentialsSignin") return "Email or password is incorrect.";
  return "Couldn't sign you in. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    startTransition(async () => {
      try {
        const res = await signIn("credentials", { email, password, redirect: false });
        if (!res || res.error) {
          toast.error(friendlySignInError(res?.error));
          return;
        }
        toast.success("Welcome back.");
        const next = search.get("callbackUrl") ?? "/dashboard";
        router.replace(next);
        router.refresh();
      } catch {
        toast.error("Couldn't sign you in. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {search.get("registered") && (
        <p className="rounded-md border border-border bg-secondary/50 p-3 text-sm">
          Account created. Sign in to continue.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Forgot?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
