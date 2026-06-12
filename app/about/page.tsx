import type { Metadata } from "next";
import Link from "next/link";
import { Award, Handshake, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustedPartners } from "@/components/trusted-partners";
import { getContact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "About · Iyknel",
  description:
    "Iyknel Ventures Ltd has been bridging the gap in FMCG distribution and logistics across Lagos and beyond since 1999.",
};

export default function AboutPage() {
  const contact = getContact();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container py-12 md:py-20">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              About Iyknel
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Bridging the gap in FMCG distribution since 1999.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              A dedicated team committed to delivering a wide range of quality food products to
              wholesalers, retail outlets, bakeries, and supermarkets across Lagos and its
              environs.
            </p>
          </div>
        </section>

        {/* Background */}
        <section className="bg-surface-muted">
          <div className="container grid gap-10 py-12 md:grid-cols-3 md:py-16">
            <div className="space-y-3 md:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Background
              </span>
              <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                From 1999 to today.
              </h2>
              <p className="text-sm text-muted-foreground">
                Two decades of building distribution and logistics infrastructure for Nigerian
                businesses.
              </p>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-foreground/90 md:col-span-2 md:text-base">
              <p>
                Iyknel Ventures Ltd started business in 1999 and was incorporated in August 2002.
                The Company initially started out and was engaged in communications, importation,
                marketing and distribution of household products.
              </p>
              <p>
                In 2013 Iyknel Ventures saw a gap in the Fast-Moving Consumer Goods (FMCG)
                business alongside with the Logistics and Haulage business and executed a business
                plan to fill these gaps.
              </p>
              <p>
                The company over the last number of years have invested its energy, time and
                resources in ensuring that we bridge the gap in the distribution of FMCG within
                the Lagos metropolis to Wholesalers, retail outlets, supermarkets and homes with
                our wide range of food products. We also bridge the gap in the Logistics and
                Haulage business by investing in trucks and trailers which help producers,
                manufacturers and distributors move their goods intra and inter states.
              </p>
            </div>
          </div>
        </section>

        {/* Who we are */}
        <section className="container py-12 md:py-16">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Who we are
            </span>
            <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              A team committed to quality and consistency.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              We are a dedicated team with a drive to bridge the gap in the distribution of
              Fast-Moving Consumer Goods (FMCG) within the Lagos metropolis and its environs — to
              Wholesalers, Retail Outlets, Bakeries and Supermarkets — with our wide range of
              products. We are committed to delivering quality products.
            </p>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="bg-surface-muted">
          <div className="container grid gap-6 py-12 md:grid-cols-2 md:py-16">
            <div className="space-y-4 rounded-2xl border bg-card p-6 md:p-8">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">
                  01
                </span>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">Vision</h2>
              </div>
              <p className="text-base leading-relaxed">
                To be a global leader in products distribution.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6 md:p-8">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">
                  02
                </span>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">Mission</h2>
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground/90 md:text-base">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>To give our customers an edge in their business dealings with us.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>To be excellent in service delivery.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>To be exceptional in our business conduct.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>To make our employees successful and fulfilled.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>To make our investors smile at their investment with us.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="container py-12 md:py-16">
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Our core values
            </span>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              What we stand for.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            <Value
              icon={<Sparkles className="h-6 w-6 text-primary" />}
              title="Outstanding customer service"
              body="Every order, every invoice, every delivery — treated with the care of a long-term partnership."
            />
            <Value
              icon={<Award className="h-6 w-6 text-primary" />}
              title="Hard work"
              body="We out-execute. Two decades of distribution discipline behind every dispatch."
            />
            <Value
              icon={<ShieldCheck className="h-6 w-6 text-primary" />}
              title="Integrity"
              body="Honest pricing, transparent logistics, and invoices you can trust."
            />
            <Value
              icon={<Handshake className="h-6 w-6 text-primary" />}
              title="Professionalism"
              body="Clear communication, prompt fulfilment, and the conduct your business deserves."
            />
          </div>
        </section>

        {/* Visit us */}
        <section className="container py-12 md:py-16">
          <div className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-2 md:p-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <MapPin className="h-4 w-4" />
                Visit us
              </div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Office address</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address.full)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm leading-relaxed text-foreground/90 hover:text-primary"
              >
                {contact.address.line1}
                <br />
                {contact.address.line2}
                <br />
                {contact.address.lga}, {contact.address.state}
              </a>
              <p className="text-xs text-muted-foreground">
                Visits by appointment only — please call ahead.
              </p>
            </div>
            <div className="space-y-3 md:border-l md:pl-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Get in touch
              </h3>
              {contact.phones.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {contact.phones.map((p) => (
                    <li key={p.e164} className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <a href={p.href} className="hover:text-primary">
                        {p.display}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href={`mailto:${contact.email}`} className="hover:text-primary">
                    {contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Trusted partners */}
        <TrustedPartners />

        {/* CTA band */}
        <section className="container pb-16">
          <div className="grid overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/95 to-primary p-8 text-primary-foreground md:grid-cols-2 md:p-12">
            <div className="space-y-4">
              <h3 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">
                Open a wholesale account in minutes.
              </h3>
              <p className="max-w-md text-primary-foreground/85">
                Submit your business details, get verified, and start placing bulk orders.
                Invoices, logistics, and delivery — all handled.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-end gap-3 md:mt-0 md:justify-end">
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <Link href="/register">Open an account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Value({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
