import "server-only";

export type Contact = {
  email: string | null;
  phone: string | null;
  phoneDisplay: string | null;
  whatsapp: string | null;
  whatsappUrl: string | null;
};

function formatPhone(e164: string): string {
  // +2348012345678 -> +234 801 234 5678
  if (!e164.startsWith("+234") || e164.length !== 14) return e164;
  return `${e164.slice(0, 4)} ${e164.slice(4, 7)} ${e164.slice(7, 10)} ${e164.slice(10)}`;
}

export function getContact(): Contact {
  const email = process.env.CONTACT_EMAIL?.trim() || null;
  const phone = process.env.CONTACT_PHONE?.trim() || null;
  const whatsapp = process.env.CONTACT_WHATSAPP?.replace(/\D/g, "") || null;
  return {
    email,
    phone,
    phoneDisplay: phone ? formatPhone(phone) : null,
    whatsapp,
    whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}` : null,
  };
}
