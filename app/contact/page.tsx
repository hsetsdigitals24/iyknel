import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getContact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact · Iyknel",
  description:
    "Reach the Iyknel back office for orders, invoices, logistics, and partnership inquiries.",
};

export default function ContactPage() {
  const contact = getContact();
  const bank = {
    name: process.env.BANK_NAME ?? null,
    accountName: process.env.BANK_ACCOUNT_NAME ?? null,
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? null,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="container py-12 md:py-16">
          <div className="mx-auto max-w-2xl space-y-4 text-center">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Contact us
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              We&apos;re here to help.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              For orders, invoices, logistics, or partnership inquiries — reach the back office
              through any of the channels below. We respond within one business day.
            </p>
          </div>
        </section>

        <section className="container pb-12 md:pb-16">
          <div className="grid gap-4 md:grid-cols-2">
            {contact.email && (
              <ContactCard
                icon={<Mail className="h-5 w-5 text-primary" />}
                title="Email"
                primary={contact.email}
                href={`mailto:${contact.email}`}
                hint="Best for invoice queries and order changes."
              />
            )}
            {contact.phone && contact.phoneDisplay && (
              <ContactCard
                icon={<Phone className="h-5 w-5 text-primary" />}
                title="Phone"
                primary={contact.phoneDisplay}
                href={`tel:${contact.phone}`}
                hint="Mon–Sat, 9am–6pm (WAT)."
              />
            )}
            {contact.whatsappUrl && (
              <ContactCard
                icon={<MessageCircle className="h-5 w-5 text-primary" />}
                title="WhatsApp"
                primary="Chat with the back office"
                href={contact.whatsappUrl}
                external
                hint="Send product enquiries, transfer screenshots, or delivery updates."
              />
            )}
            <ContactCard
              icon={<MapPin className="h-5 w-5 text-primary" />}
              title="Office"
              primary="Lagos, Nigeria"
              hint="Visits by appointment only — please call ahead."
            />
          </div>
        </section>

        <section className="bg-surface-muted">
          <div className="container grid gap-10 py-12 md:grid-cols-2 md:py-16">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Clock className="h-4 w-4" />
                Hours
              </div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                When you can reach us
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex justify-between border-b border-border/60 pb-2">
                  <span>Monday – Friday</span>
                  <span className="font-medium text-foreground">9:00am – 6:00pm</span>
                </li>
                <li className="flex justify-between border-b border-border/60 pb-2">
                  <span>Saturday</span>
                  <span className="font-medium text-foreground">10:00am – 4:00pm</span>
                </li>
                <li className="flex justify-between">
                  <span>Sunday & public holidays</span>
                  <span className="font-medium text-foreground">Closed</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Order submissions outside business hours are queued and verified the next working
                day.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6 md:p-8">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Bank transfer</h2>
              <p className="text-sm text-muted-foreground">
                We accept payment by bank transfer only — pay into the account printed on your
                invoice.
              </p>
              {bank.name || bank.accountName || bank.accountNumber ? (
                <dl className="space-y-2 text-sm">
                  {bank.name && (
                    <div className="flex justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Bank</dt>
                      <dd className="font-medium">{bank.name}</dd>
                    </div>
                  )}
                  {bank.accountName && (
                    <div className="flex justify-between border-b border-border/60 pb-2">
                      <dt className="text-muted-foreground">Account name</dt>
                      <dd className="font-medium">{bank.accountName}</dd>
                    </div>
                  )}
                  {bank.accountNumber && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Account number</dt>
                      <dd className="font-mono font-medium">{bank.accountNumber}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Bank details are shown on each invoice after your order is approved.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Use your order number as the transfer narration, then mark the order as &ldquo;I
                have paid&rdquo; so we can verify.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-12 md:py-16">
          <div className="grid overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/95 to-primary p-8 text-primary-foreground md:grid-cols-2 md:p-12">
            <div className="space-y-3">
              <h3 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">
                Need a custom quote?
              </h3>
              <p className="max-w-md text-primary-foreground/85">
                Tell us what you stock and how often. We&apos;ll come back with pricing and a
                recommended restock cadence.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-3 md:mt-0 md:justify-end">
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <Link href="/quote">Request a quote</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/register">Open an account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ContactCard({
  icon,
  title,
  primary,
  hint,
  href,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  primary: string;
  hint: string;
  href?: string;
  external?: boolean;
}) {
  const body = (
    <div className="flex gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <p className="mt-0.5 text-sm font-medium">{primary}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
  if (!href) return body;
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="block"
    >
      {body}
    </a>
  );
}
