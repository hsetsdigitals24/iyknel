import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { ADMIN_ROLES, isAdminRole, isSuperAdmin } from "@/lib/permissions";
import { AdminForm, type AdminFormData } from "../admin-form";
import { deleteAdminAction, updateAdminAction } from "../actions";
import { ConfirmDeleteAdminButton } from "../row-controls";

export default async function EditAdminPage({ params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();

  const [admin, superAdminCount] = await Promise.all([
    db.user.findUnique({ where: { id: params.id } }),
    db.user.count({ where: { role: "SUPER_ADMIN" } }),
  ]);
  if (!admin || !isAdminRole(admin.role)) notFound();

  const initial: AdminFormData = {
    name: admin.name ?? "",
    email: admin.email,
    phone: admin.phone ?? "",
    role: ADMIN_ROLES.includes(admin.role as (typeof ADMIN_ROLES)[number])
      ? (admin.role as (typeof ADMIN_ROLES)[number])
      : "MANAGER",
  };

  const isSelf = admin.id === session.user.id;
  const isLastSuperAdmin = isSuperAdmin(admin.role) && superAdminCount <= 1;
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
        {isSelf || isLastSuperAdmin ? (
          <p className="max-w-[220px] text-right text-xs text-muted-foreground">
            {isSelf
              ? "You can't delete your own account."
              : "The last Super Admin account can't be deleted."}
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
