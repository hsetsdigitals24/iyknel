import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { h: "h-7", width: 200, height: 70 },
  md: { h: "h-9", width: 257, height: 90 },
  lg: { h: "h-12", width: 343, height: 120 },
} as const;

type Props = {
  size?: keyof typeof SIZES;
  href?: string;
  priority?: boolean;
  className?: string;
};

export function BrandLogo({ size = "sm", href = "/", priority = false, className }: Props) {
  const s = SIZES[size];
  return (
    <Link href={href} aria-label="Iyknel — home" className={cn("inline-flex items-center", className)}>
      <Image
        src="/main_logo.png"
        alt="Iyknel"
        width={s.width}
        height={s.height}
        priority={priority}
        className={cn(s.h, "w-auto")}
      />
    </Link>
  );
}
