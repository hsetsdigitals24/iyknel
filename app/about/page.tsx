import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Banknote, MapPin, ShieldCheck, Truck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About · Iyknel",
  description:
    "Iyknel is a B2B wholesale FMCG marketplace for Nigerian businesses. Browse, order, pay by transfer, and we handle logistics.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="container py-12 md:py-20">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              About Iyknel
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Wholesale FMCG, restocked from one invoice.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Iyknel is a B2B wholesale marketplace for fast-moving consumer goods in Nigeria. We
              help shops, supermarkets, and offices restock from a single catalog — with verified
              suppliers, bank-transfer checkout, and computed logistics.
            </p>
          </div>
        </section>

        <section className="bg-surface-muted">
          <div className="container grid gap-10 py-12 md:grid-cols-2 md:py-16">
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
                What we do
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Iyknel exists to make restocking predictable. Browse the catalog by category, build
                a cart, submit the order, and pay by bank transfer to the invoice. Our back office
                verifies your payment, picks the right vehicle for your order weight and distance,
                and dispatches to your address.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                No payment gateways. No hidden fees. No surprises — vehicle and price are computed
                from your order and your distance band.
              </p>
            </div>
            <ul className="space-y-3">
              <Bullet
                icon={<Banknote className="h-5 w-5 text-primary" />}
                title="Bank-transfer checkout"
                body="Pay directly into the business account printed on your invoice. The back office verifies and clears."
              />
              <Bullet
                icon={<Truck className="h-5 w-5 text-primary" />}
                title="Logistics computed for you"
                body="Vehicle is auto-selected by total weight. Cost is pulled from the published matrix — no haggling."
              />
              <Bullet
                icon={<BadgeCheck className="h-5 w-5 text-primary" />}
                title="Verified businesses only"
                body="Signup collects business name, RC number, and delivery address. B2B only — no consumer accounts."
              />
            </ul>
          </div>
        </section>

        <section className="container py-12 md:py-16">
          <div className="mb-8 text-center">
            <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
              What we believe
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Three principles that shape how we serve wholesale buyers.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Value
              icon={<ShieldCheck className="h-6 w-6 text-primary" />}
              title="Honest pricing"
              body="The invoice is the price. Logistics is computed from a published matrix. No undisclosed surcharges."
            />
            <Value
              icon={<Users className="h-6 w-6 text-primary" />}
              title="Built for shop owners"
              body="Cartons, loose pieces, units-per-carton — the catalog speaks the language of a wholesaler, not a consumer site."
            />
            <Value
              icon={<MapPin className="h-6 w-6 text-primary" />}
              title="Lagos-first, growing"
              body="We start where same-day matters. Distance bands cover Lagos mainland and expanding metros."
            />
          </div>
        </section>

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

function Bullet({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </li>
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
