import Link from "next/link";
import { PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-surface-muted/40 px-4 py-16">
        <div className="max-w-md rounded-2xl border bg-card p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PackageSearch className="h-8 w-8" />
          </div>
          <p className="mt-6 font-serif text-5xl font-bold tracking-tight">404</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The link may be broken, or the product or order you&apos;re looking for has moved.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="rounded-full">
              <Link href="/products">Browse catalog</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
