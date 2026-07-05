import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireAdmin } from "@/lib/session";
import { AdminForm } from "../admin-form";
import { createAdminAction } from "../actions";

export default async function NewAdminPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </Link>
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Account
          </span>
          <h1 className="font-serif text-3xl">New admin</h1>
        </div>
      </header>
      <AdminForm mode="create" action={createAdminAction} />
    </div>
  );
}
