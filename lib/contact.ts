import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";

export type ContactPhone = {
  e164: string;
  display: string;
  href: string;
};

export type ContactAddress = {
  line1: string;
  line2: string;
  lga: string;
  state: string;
  full: string;
};

export type Contact = {
  email: string | null;
  phones: ContactPhone[];
  whatsapp: string | null;
  whatsappUrl: string | null;
  address: ContactAddress;
};

const DEFAULT_EMAIL = "info@iyknel.com";
const DEFAULT_PHONES_RAW = "08182806282,08114499558";
const DEFAULT_ADDRESS_LINE1 = "Plot 10 Abesan Estate Road";
const DEFAULT_ADDRESS_LINE2 = "Abesan Estate, Ipaja";
const DEFAULT_ADDRESS_LGA = "Alimosho LGA";
const DEFAULT_ADDRESS_STATE = "Lagos";

function formatPhone(e164: string): string {
  // +2348012345678 -> +234 801 234 5678
  if (!e164.startsWith("+234") || e164.length !== 14) return e164;
  return `${e164.slice(0, 4)} ${e164.slice(4, 7)} ${e164.slice(7, 10)} ${e164.slice(10)}`;
}

function to234(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  // Assume already E.164 without country prefix is unsafe — fall back to raw.
  return raw.startsWith("+") ? raw : null;
}

function parsePhones(raw: string | undefined | null): ContactPhone[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((local) => {
      const e164 = to234(local);
      if (!e164) return null;
      return { e164, display: formatPhone(e164), href: `tel:${e164}` };
    })
    .filter((p): p is ContactPhone => p !== null);
}

export type WhatsappContactView = {
  id: string;
  label: string;
  display: string;
  waUrl: string;
};

export const WHATSAPP_CONTACTS_TAG = "whatsapp-contacts";

// Normalize any accepted phone format to wa.me digits, e.g. "2348012345678".
export function toWhatsappDigits(raw: string): string | null {
  const e164 = to234(raw);
  if (!e164) return null;
  return e164.replace(/\D/g, "");
}

const listActiveWhatsappContacts = unstable_cache(
  () =>
    db.whatsappContact.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, label: true, phone: true },
    }),
  [WHATSAPP_CONTACTS_TAG],
  { tags: [WHATSAPP_CONTACTS_TAG] },
);

export async function getWhatsappContacts(): Promise<WhatsappContactView[]> {
  const rows = await listActiveWhatsappContacts();
  if (rows.length > 0) {
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      display: formatPhone(`+${r.phone}`),
      waUrl: `https://wa.me/${r.phone}`,
    }));
  }

  // Fall back to the single env-configured number until contacts are added.
  const digits = process.env.CONTACT_WHATSAPP?.replace(/\D/g, "");
  if (!digits) return [];
  return [
    {
      id: "env",
      label: "Chat with us",
      display: formatPhone(`+${digits}`),
      waUrl: `https://wa.me/${digits}`,
    },
  ];
}

export async function getContact(): Promise<Contact> {
  // Admin-editable contact details live on the SiteSetting singleton; fall back
  // to env vars, then hardcoded defaults, if a column is blank.
  const settings = await getSiteSettings();

  const email =
    settings.contactEmail?.trim() || process.env.CONTACT_EMAIL?.trim() || DEFAULT_EMAIL;
  const phones = parsePhones(
    settings.contactPhones?.trim() || process.env.CONTACT_PHONE || DEFAULT_PHONES_RAW,
  );
  const whatsapp = process.env.CONTACT_WHATSAPP?.replace(/\D/g, "") || null;

  const line1 =
    settings.contactAddressLine1?.trim() ||
    process.env.CONTACT_ADDRESS_LINE1?.trim() ||
    DEFAULT_ADDRESS_LINE1;
  const line2 =
    settings.contactAddressLine2?.trim() ||
    process.env.CONTACT_ADDRESS_LINE2?.trim() ||
    DEFAULT_ADDRESS_LINE2;
  const lga =
    settings.contactAddressLga?.trim() ||
    process.env.CONTACT_ADDRESS_LGA?.trim() ||
    DEFAULT_ADDRESS_LGA;
  const state =
    settings.contactAddressState?.trim() ||
    process.env.CONTACT_ADDRESS_STATE?.trim() ||
    DEFAULT_ADDRESS_STATE;
  const full = [line1, line2, lga, state].filter(Boolean).join(", ");

  return {
    email,
    phones,
    whatsapp,
    whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}` : null,
    address: { line1, line2, lga, state, full },
  };
}
