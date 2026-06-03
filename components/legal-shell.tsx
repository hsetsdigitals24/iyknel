import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Props = {
  title: string;
  updated: string;
  children: React.ReactNode;
};

export function LegalShell({ title, updated, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted/30">
      <SiteHeader />
      <main className="flex-1">
        <article className="container max-w-3xl space-y-6 py-10 md:py-16">
          <header>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Legal
            </span>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Last updated: {updated}</p>
          </header>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

export function legalMetadata(title: string): Metadata {
  return {
    title: `${title} · Iyknel`,
  };
}
