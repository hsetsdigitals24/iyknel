import type { OrderStatus } from "@prisma/client";
import { StatusPill } from "@/components/status-pill";

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <StatusPill status={status} />;
}
