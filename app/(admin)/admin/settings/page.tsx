import Link from "next/link";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS, isSuperAdmin } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChangePasswordForm } from "./change-password-form";
import { deleteAdminAction } from "./admins/actions";
import { ConfirmDeleteAdminButton } from "./admins/row-controls";
import { deleteWhatsappContactAction } from "./whatsapp/actions";
import { ConfirmDeleteContactButton } from "./whatsapp/row-controls";
import { FreeLogisticsForm } from "./free-logistics/free-logistics-form";
import { BankDetailsForm } from "./bank-details/bank-details-form";
import { ContactDetailsForm } from "./contact-details/contact-details-form";

export default async function AdminSettingsPage() {
  const session = await requireAdmin();

  const canManage = isSuperAdmin(session.user.role);

  const [admins, whatsappContacts, siteSettings] = await Promise.all([
    db.user.findMany({
      where: { role: { in: [...ADMIN_ROLES] } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    }),
    db.whatsappContact.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getSiteSettings(),
  ]);
  const superAdminCount = admins.filter((a) => a.role === "SUPER_ADMIN").length;

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

      {canManage && (
      <section className="max-w-md space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Free logistics banner</h2>
          <p className="text-sm text-muted-foreground">
            The promo pill on product pages, and the order value at which delivery is
            waived in the cart.
          </p>
        </div>
        <FreeLogisticsForm
          initial={{
            thresholdNaira: siteSettings.freeLogisticsThresholdKobo / 100,
            bannerText: siteSettings.freeLogisticsBannerText,
          }}
        />
      </section>
      )}

      {canManage && (
      <section className="max-w-md space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Bank details</h2>
          <p className="text-sm text-muted-foreground">
            The payee account shown on invoices, approval emails, order pages, and the
            contact page. Customers pay by transfer using their order number as reference.
          </p>
        </div>
        <BankDetailsForm
          initial={{
            bankName: siteSettings.bankName,
            bankAccountName: siteSettings.bankAccountName,
            bankAccountNumber: siteSettings.bankAccountNumber,
          }}
        />
      </section>
      )}

      {canManage && (
      <section className="max-w-md space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Contact details</h2>
          <p className="text-sm text-muted-foreground">
            The email, phone, and address shown on the contact page, site footer, about page,
            invoices, and transactional emails.
          </p>
        </div>
        <ContactDetailsForm
          initial={{
            contactEmail: siteSettings.contactEmail,
            contactPhones: siteSettings.contactPhones,
            contactAddressLine1: siteSettings.contactAddressLine1,
            contactAddressLine2: siteSettings.contactAddressLine2,
            contactAddressLga: siteSettings.contactAddressLga,
            contactAddressState: siteSettings.contactAddressState,
          }}
        />
      </section>
      )}

      {canManage && (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Admin accounts</h2>
            <p className="text-sm text-muted-foreground">
              People who can access the back office.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/settings/admins/new">New admin</Link>
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => {
                const isSelf = a.id === session.user.id;
                const isLastSuperAdmin =
                  a.role === "SUPER_ADMIN" && superAdminCount <= 1;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/settings/admins/${a.id}`}
                          className="font-medium hover:underline"
                        >
                          {a.name ?? "—"}
                        </Link>
                        {isSelf && <Badge variant="secondary">You</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={a.role === "SUPER_ADMIN" ? "default" : "outline"}
                      >
                        {ADMIN_ROLE_LABELS[
                          a.role as keyof typeof ADMIN_ROLE_LABELS
                        ] ?? a.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.createdAt.toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/settings/admins/${a.id}`}>Edit</Link>
                        </Button>
                        {!isSelf && !isLastSuperAdmin && (
                          <form action={deleteAdminAction.bind(null, a.id)}>
                            <ConfirmDeleteAdminButton
                              label={`Delete ${a.name ?? a.email}`}
                            />
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
      )}

      {canManage && (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">WhatsApp contacts</h2>
            <p className="text-sm text-muted-foreground">
              Phone lines shown on the floating WhatsApp chat button.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/settings/whatsapp/new">New contact</Link>
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {whatsappContacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No contacts yet — the button falls back to the CONTACT_WHATSAPP
                    number.
                  </TableCell>
                </TableRow>
              )}
              {whatsappContacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/settings/whatsapp/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.label}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">+{c.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{c.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "secondary" : "outline"}>
                      {c.active ? "Active" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/settings/whatsapp/${c.id}`}>Edit</Link>
                      </Button>
                      <form action={deleteWhatsappContactAction.bind(null, c.id)}>
                        <ConfirmDeleteContactButton label={`Delete ${c.label}`} />
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      )}
    </div>
  );
}
