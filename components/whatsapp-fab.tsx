import { getWhatsappContacts } from "@/lib/contact";
import { WhatsAppFabClient } from "@/components/whatsapp-fab-client";

export async function WhatsAppFab() {
  const contacts = await getWhatsappContacts();
  if (contacts.length === 0) return null;
  return <WhatsAppFabClient contacts={contacts} />;
}
