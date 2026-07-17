import { requireSection } from "@/lib/session";

export default async function OrdersSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("orders");
  return <>{children}</>;
}
