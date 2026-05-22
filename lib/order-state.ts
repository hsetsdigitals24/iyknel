import type { OrderStatus } from "@prisma/client";

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["AWAITING_APPROVAL", "CANCELLED"],
  AWAITING_APPROVAL: ["AWAITING_PAYMENT", "SUBMITTED", "CANCELLED"],
  AWAITING_PAYMENT: ["PAYMENT_REVIEW", "SUBMITTED", "CANCELLED"],
  PAYMENT_REVIEW: ["PAID", "AWAITING_PAYMENT", "CANCELLED"],
  PAID: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function formatOrderNumber(year: number, monthIndex: number, sequence: number): string {
  const ym = `${year}${String(monthIndex + 1).padStart(2, "0")}`;
  return `ORD-${ym}-${String(sequence).padStart(4, "0")}`;
}
