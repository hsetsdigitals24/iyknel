import { describe, expect, it } from "vitest";
import { parseProductCsv } from "./csv";

const HEADER = "sku,name,category,price_naira,weight_grams,stock_delta,description";

describe("parseProductCsv", () => {
  it("parses a valid 2-row CSV", async () => {
    const csv = [
      HEADER,
      "SKU-1,Garri,Foods,1500.00,1200,50,Tasty",
      "SKU-2,Rice,Foods,4000,2500,30,",
    ].join("\n");
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows).toHaveLength(2);
      expect(res.rows[0]).toMatchObject({
        sku: "SKU-1",
        name: "Garri",
        price_naira: 1500,
        weight_grams: 1200,
        stock_delta: 50,
      });
    }
  });

  it("reports missing required header", async () => {
    const csv = "sku,name,price_naira\nA,Foo,1\n";
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toContain("Missing header");
      expect(res.message).toContain("category");
    }
  });

  it("reports per-row error for invalid number", async () => {
    const csv = [HEADER, "SKU-1,Garri,Foods,abc,1000,1,"].join("\n");
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0].rowIndex).toBe(2);
      expect(res.errors[0].messages.join(" ")).toMatch(/price_naira/);
    }
  });

  it("rejects blank required field (name)", async () => {
    const csv = [HEADER, "SKU-1,,Foods,1000,1000,1,"].join("\n");
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0].messages.join(" ")).toMatch(/name/);
    }
  });

  it("accepts empty description", async () => {
    const csv = [HEADER, "SKU-1,Garri,Foods,1000,1000,1,"].join("\n");
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(true);
  });
});
