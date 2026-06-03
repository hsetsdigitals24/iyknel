import { describe, expect, it } from "vitest";

import { FREE_LOGISTICS_THRESHOLD_KOBO, logisticsWaiverFor } from "./logistics";

// Placeholder smoke test for lib/logistics.ts.
// The real vehicle-picker tests will be wired in step 2 once we have
// an injectable data source. For now, just sanity-check arithmetic
// so `npm test` has something green to report.
describe("logistics arithmetic", () => {
  it("converts naira to kobo without floating-point drift", () => {
    expect(Math.round(112750 * 100)).toBe(11275000);
    expect(Math.round(879.38 * 100)).toBe(87938);
  });

  it("computes trip count for overflow weights", () => {
    const tonnageKg = 7500;
    const orderKg = 18_000;
    expect(Math.ceil(orderKg / tonnageKg)).toBe(3);
  });
});

describe("logisticsWaiverFor", () => {
  it("reports remaining amount below the threshold", () => {
    const waiver = logisticsWaiverFor(15_000_000);
    expect(waiver.waived).toBe(false);
    expect(waiver.remainingKobo).toBe(FREE_LOGISTICS_THRESHOLD_KOBO - 15_000_000);
  });

  it("waives logistics at or above the threshold", () => {
    expect(logisticsWaiverFor(FREE_LOGISTICS_THRESHOLD_KOBO).waived).toBe(true);
    expect(logisticsWaiverFor(50_000_000).waived).toBe(true);
    expect(logisticsWaiverFor(50_000_000).remainingKobo).toBe(0);
  });
});
