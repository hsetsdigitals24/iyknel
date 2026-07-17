import { requireSection } from "@/lib/session";

export default async function LogisticsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("logistics");
  return <>{children}</>;
}
