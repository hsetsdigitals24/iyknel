import { requireSection } from "@/lib/session";

export default async function QuotesSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("quotes");
  return <>{children}</>;
}
