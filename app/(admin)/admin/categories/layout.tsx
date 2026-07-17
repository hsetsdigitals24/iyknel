import { requireSection } from "@/lib/session";

export default async function CategoriesSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("categories");
  return <>{children}</>;
}
