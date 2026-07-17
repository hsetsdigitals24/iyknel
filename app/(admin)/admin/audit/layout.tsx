import { requireSection } from "@/lib/session";

export default async function AuditSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("audit");
  return <>{children}</>;
}
