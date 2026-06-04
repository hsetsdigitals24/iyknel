import Image from "next/image";
import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  image?: string | null;
};

export function CategoryTile({ slug, name, image }: Props) {
  return (
    <Link
      href={`/products?category=${slug}`}
      className="group flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-surface-muted ring-1 ring-border">
        <Image
          src={image || "/placeholders/product.svg"}
          alt={name}
          fill
          sizes="80px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <p className="text-sm font-medium leading-tight">{name}</p>
    </Link>
  );
}
