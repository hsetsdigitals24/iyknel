import { MessageCircle } from "lucide-react";

import { getContact } from "@/lib/contact";

export function WhatsAppFab() {
  const { whatsappUrl } = getContact();
  if (!whatsappUrl) return null;
  return (
    <a
      href={`${whatsappUrl}?text=${encodeURIComponent("Hi Iyknel, I'd like to ask about a wholesale order.")}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg shadow-success/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
