import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { AdminForm, type AdminFormData } from "../admin-form";
import { deleteAdminAction, updateAdminAction } from "../actions";
import { ConfirmDeleteAdminButton } from "../row-controls";

export default async function EditAdminPage({ params }: { params: { id: string } }) {
  const session = await requireAdmin();

  const [admin, adminCount] = await Promise.all([
    db.user.findUnique({ where: { id: params.id } }),
    db.user.count({ where: { role: "ADMIN" } }),
  ]);
  if (!admin || admin.role !== "ADMIN") notFound();

  const initial: AdminFormData = {
    name: admin.name ?? "",
    email: admin.email,
    phone: admin.phone ?? "",
  };

  const isSelf = admin.id === session.user.id;
  const isLastAdmin = adminCount <= 1;
  const boundAction = updateAdminAction.bind(null, admin.id);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
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
            <h1 className="font-serif text-3xl">{admin.name ?? admin.email}</h1>
          </div>
        </div>
        {isSelf || isLastAdmin ? (
          <p className="max-w-[220px] text-right text-xs text-muted-foreground">
            {isSelf
              ? "You can't delete your own account."
              : "The last admin account can't be deleted."}
          </p>
        ) : (
          <form action={deleteAdminAction.bind(null, admin.id)}>
            <ConfirmDeleteAdminButton label={`Delete ${admin.name ?? admin.email}`} />
          </form>
        )}
      </header>
      <AdminForm mode="edit" initial={initial} action={boundAction} />
    </div>
  );
}
