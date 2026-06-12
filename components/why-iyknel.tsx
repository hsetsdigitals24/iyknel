import { BadgeCheck, Banknote, ShieldCheck, Truck } from "lucide-react";

const POINTS = [
  {
    icon: BadgeCheck,
    title: "B2B accounts only",
    body: "Every buyer is a Nigerian business.",
  },
  {
    icon: Truck,
    title: "Logistics, sorted",
    body: "Vehicle and delivery cost auto-priced from your weight and Lagos route — no haggling.",
  },
  {
    icon: Banknote,
    title: "Bank-transfer checkout",
    body: "No card fees, no payment gateways. You pay direct, we ship same week.",
  },
  {
    icon: ShieldCheck,
    title: "Invoice on every order",
    body: "Each order ships with a PDF invoice — clean books for your accountant.",
  },
];

export function WhyIyknel() {
  return (
    <section className="container py-12 bg-surface-muted mb-4">
      <header className="mb-8 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Why Iyknel
        </span>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Built for shop owners, not card-tappers.
        </h2>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p) => (
          <div key={p.title} className="rounded-xl border bg-card p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {p.icon && <p.icon className="h-6 w-6 text-primary" />}
              </div>
            <h3 className="mt-3 font-serif text-lg font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
