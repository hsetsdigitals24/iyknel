"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

function navigate(router: ReturnType<typeof useRouter>, href: string) {
  router.push(href);
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    "a, button, input, textarea, select, label, [role='button'], [data-stop-row-click]",
  );
}

export function ClickableRow({ href, children, className }: Props) {
  const router = useRouter();
  return (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={(e) => {
        if (isInteractive(e.target)) return;
        navigate(router, href);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(router, href);
        }
      }}
      role="link"
      tabIndex={0}
      data-href={href}
    >
      {children}
    </TableRow>
  );
}

export function ClickableListItem({ href, children, className }: Props) {
  const router = useRouter();
  return (
    <li
      className={cn(
        "cursor-pointer transition hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={(e) => {
        if (isInteractive(e.target)) return;
        navigate(router, href);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(router, href);
        }
      }}
      role="link"
      tabIndex={0}
      data-href={href}
    >
      {children}
    </li>
  );
}

export function ClickableTr({ href, children, className }: Props) {
  const router = useRouter();
  return (
    <tr
      className={cn(
        "cursor-pointer transition hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={(e) => {
        if (isInteractive(e.target)) return;
        navigate(router, href);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(router, href);
        }
      }}
      role="link"
      tabIndex={0}
      data-href={href}
    >
      {children}
    </tr>
  );
}
