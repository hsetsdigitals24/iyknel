import { describe, expect, it } from "vitest";
import { canTransition, formatOrderNumber } from "./order-state";

describe("canTransition", () => {
  it("allows the happy-path forward chain", () => {
    expect(canTransition("SUBMITTED", "AWAITING_APPROVAL")).toBe(true);
    expect(canTransition("AWAITING_APPROVAL", "AWAITING_PAYMENT")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "PAYMENT_REVIEW")).toBe(true);
    expect(canTransition("PAYMENT_REVIEW", "PAID")).toBe(true);
    expect(canTransition("PAID", "DISPATCHED")).toBe(true);
    expect(canTransition("DISPATCHED", "DELIVERED")).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransition("SUBMITTED", "PAID")).toBe(false);
    expect(canTransition("SUBMITTED", "DISPATCHED")).toBe(false);
    expect(canTransition("AWAITING_APPROVAL", "DELIVERED")).toBe(false);
  });

  it("allows admin to bounce a bad payment back to AWAITING_PAYMENT", () => {
    expect(canTransition("PAYMENT_REVIEW", "AWAITING_PAYMENT")).toBe(true);
  });

  it("treats DELIVERED and CANCELLED as terminal", () => {
    expect(canTransition("DELIVERED", "DISPATCHED")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "SUBMITTED")).toBe(false);
  });

  it("allows cancellation from any non-terminal status", () => {
    for (const s of [
      "DRAFT",
      "SUBMITTED",
      "AWAITING_APPROVAL",
      "AWAITING_PAYMENT",
      "PAYMENT_REVIEW",
      "PAID",
    ] as const) {
      expect(canTransition(s, "CANCELLED")).toBe(true);
    }
  });
});

describe("formatOrderNumber", () => {
  it("zero-pads month and sequence", () => {
    expect(formatOrderNumber(2026, 0, 1)).toBe("ORD-202601-0001");
    expect(formatOrderNumber(2026, 11, 42)).toBe("ORD-202612-0042");
  });

  it("zero-pads sequences up to 4 digits", () => {
    expect(formatOrderNumber(2026, 4, 9999)).toBe("ORD-202605-9999");
  });
});
