import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted/40">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-8 md:py-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
