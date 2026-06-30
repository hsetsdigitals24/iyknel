import { BadgeCheck, Banknote, Truck } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground md:flex">
        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="font-serif text-4xl font-semibold leading-tight lg:text-5xl">
            Wholesale FMCG, delivered.
          </h2>
          <p className="text-primary-foreground/85">
            Browse, build a cart, submit your order. We compute logistics and invoice you. Pay by
            bank transfer — your goods ship the same week.
          </p>
        </div>

        <ul className="relative z-10 space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <Banknote className="h-5 w-5" />
            <span>Bank-transfer checkout — no payment gateways</span>
          </li>
          <li className="flex items-center gap-3">
            <Truck className="h-5 w-5" />
            <span>Logistics auto-priced from weight + distance</span>
          </li>
          <li className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5" />
            <span>Verified B2B accounts only</span>
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-center bg-white p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center">
            <BrandLogo size="md" priority />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
