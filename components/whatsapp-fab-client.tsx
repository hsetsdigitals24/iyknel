"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";

import type { WhatsappContactView } from "@/lib/contact";

const PREFILL = encodeURIComponent(
  "Hi Iyknel, I'd like to ask about a wholesale order.",
);

const FAB_CLASSES =
  "fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg shadow-success/30 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2";

export function WhatsAppFabClient({
  contacts,
}: {
  contacts: WhatsappContactView[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  if (contacts.length === 1) {
    return (
      <a
        href={`${contacts[0].waUrl}?text=${PREFILL}`}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Chat with us on WhatsApp"
        className={FAB_CLASSES}
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    );
  }

  return (
    <div ref={rootRef}>
      {open && (
        <div
          role="dialog"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-[5.5rem] right-5 z-50 w-72 overflow-hidden rounded-xl border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="bg-success px-4 py-3 text-success-foreground">
            <p className="text-sm font-semibold">Chat with us on WhatsApp</p>
            <p className="text-xs opacity-90">Pick a line to start chatting.</p>
          </div>
          <ul className="divide-y">
            {contacts.map((c) => (
              <li key={c.id}>
                <a
                  href={`${c.waUrl}?text=${PREFILL}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {c.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {c.display}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        aria-label={open ? "Close WhatsApp chat options" : "Chat with us on WhatsApp"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={FAB_CLASSES}
      >
        {open ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
      </button>
    </div>
  );
}
