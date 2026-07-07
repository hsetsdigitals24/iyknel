import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  WhatsappContactForm,
  type WhatsappContactFormData,
} from "../contact-form";
import { deleteWhatsappContactAction, updateWhatsappContactAction } from "../actions";
import { ConfirmDeleteContactButton } from "../row-controls";

export default async function EditWhatsappContactPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const contact = await db.whatsappContact.findUnique({ where: { id: params.id } });
  if (!contact) notFound();

  const initial: WhatsappContactFormData = {
    label: contact.label,
    phone: `+${contact.phone}`,
    sortOrder: contact.sortOrder,
    active: contact.active,
  };

  const boundAction = updateWhatsappContactAction.bind(null, contact.id);

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
              WhatsApp
            </span>
            <h1 className="font-serif text-3xl">{contact.label}</h1>
          </div>
        </div>
        <form action={deleteWhatsappContactAction.bind(null, contact.id)}>
          <ConfirmDeleteContactButton label={`Delete ${contact.label}`} />
        </form>
      </header>
      <WhatsappContactForm mode="edit" initial={initial} action={boundAction} />
    </div>
  );
}
