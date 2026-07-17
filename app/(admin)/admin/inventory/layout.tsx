import { requireSection } from "@/lib/session";

export default async function InventorySectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("inventory");
  return <>{children}</>;
}
