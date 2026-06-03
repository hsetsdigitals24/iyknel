import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { QuoteForm } from "./quote-form";

export const metadata: Metadata = {
  title: "Request a quote · Iyknel",
  description:
    "Tell us what your business needs — we&rsquo;ll send a quote with logistics within one business day.",
};

export default function QuotePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted/40">
      <SiteHeader />
      <main className="flex-1">
        <div className="container max-w-2xl py-10 md:py-16">
          <header className="mb-8 space-y-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              B2B enquiries
            </span>
            <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              Request a wholesale quote
            </h1>
            <p className="text-sm text-muted-foreground">
              Not ready to register? Send us the broad strokes and we&rsquo;ll come back with
              pricing, vehicle options, and a delivery window.
            </p>
          </header>
          <QuoteForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
