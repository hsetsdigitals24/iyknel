import { requireAdmin } from "@/lib/session";
import { ChangePasswordForm } from "./change-password-form";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Account
        </span>
        <h1 className="font-serif text-3xl">Settings</h1>
      </header>

      <section className="max-w-md space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Change password</h2>
          <p className="text-sm text-muted-foreground">
            Update the password for your admin account.
          </p>
        </div>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
