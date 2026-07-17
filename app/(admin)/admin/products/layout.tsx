import { requireSection } from "@/lib/session";

export default async function ProductsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("products");
  return <>{children}</>;
}
