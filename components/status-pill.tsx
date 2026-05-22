import { cn } from "@/lib/utils";

type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "AWAITING_APPROVAL"
  | "AWAITING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "PAID"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

const STYLES: Record<Status, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-warning/15 text-[hsl(var(--warning-foreground))] ring-1 ring-warning/30",
  AWAITING_APPROVAL: "bg-warning/15 text-[hsl(var(--warning-foreground))] ring-1 ring-warning/30",
  AWAITING_PAYMENT: "bg-warning/15 text-[hsl(var(--warning-foreground))] ring-1 ring-warning/30",
  PAYMENT_REVIEW: "bg-info/15 text-info ring-1 ring-info/30",
  PAID: "bg-success/15 text-success ring-1 ring-success/30",
  DISPATCHED: "bg-success/15 text-success ring-1 ring-success/30",
  DELIVERED: "bg-success/15 text-success ring-1 ring-success/30",
  CANCELLED: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
};

const LABELS: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  AWAITING_APPROVAL: "Awaiting approval",
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_REVIEW: "Payment review",
  PAID: "Paid",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function StatusPill({ status, className }: { status: Status | string; className?: string }) {
  const key = status as Status;
  const style = STYLES[key] ?? STYLES.DRAFT;
  const label = LABELS[key] ?? String(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
