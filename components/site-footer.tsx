import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { getContact } from "@/lib/contact";

const CATEGORY_LINKS = [
  { slug: "drinks", name: "Drinks & Beverages" },
  { slug: "snacks", name: "Snacks & Confectionery" },
  { slug: "pasta-grains", name: "Pasta, Rice & Grains" },
  { slug: "cooking-essentials", name: "Cooking Essentials" },
  { slug: "dairy-frozen", name: "Dairy & Frozen" },
  { slug: "personal-care", name: "Personal Care" },
];

export function SiteFooter() {
  const contact = getContact();
  return (
    <footer className="mt-16 border-t bg-surface-muted">
      <div className="container grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <BrandLogo size="md" />
          <p className="text-sm text-muted-foreground">
            Wholesale FMCG for Nigerian businesses. Browse the catalog, submit your order, pay by
            bank transfer — we handle logistics.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Shop</h3>
          <ul className="space-y-2 text-sm">
            {CATEGORY_LINKS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/products" className="font-medium text-primary hover:underline">
                View all →
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Account</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-muted-foreground hover:text-foreground">
                Open a wholesale account
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/orders" className="text-muted-foreground hover:text-foreground">
                My orders
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Contact</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Lagos, Nigeria</span>
            </li>
            {contact.email && (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href={`tel:${contact.phone}`} className="hover:text-foreground">
                  {contact.phoneDisplay}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container flex flex-col items-start justify-between gap-2 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Iyknel. Wholesale FMCG · B2B only.</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/about" className="hover:text-foreground">
              About
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/quote" className="hover:text-foreground">
              Request a quote
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
