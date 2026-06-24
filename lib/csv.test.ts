import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseProductCsv, parseProductFile } from "./csv";

const HEADER =
  "sku,name,category,price_naira,weight_grams,units_per_carton,cartons_delta,pieces_delta,description";

describe("parseProductCsv", () => {
  it("parses a valid 2-row CSV", async () => {
    const csv = [
      HEADER,
      "SKU-1,Garri,Foods,1500.00,1200,12,4,0,Tasty",
      "SKU-2,Rice,Foods,4000,2500,,3,0,",
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
        units_per_carton: 12,
        cartons_delta: 4,
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
    const csv = [HEADER, "SKU-1,Garri,Foods,abc,1000,,1,0,"].join("\n");
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0].rowIndex).toBe(2);
      expect(res.errors[0].messages.join(" ")).toMatch(/price_naira/);
    }
  });

  it("rejects blank required field (name)", async () => {
    const csv = [HEADER, "SKU-1,,Foods,1000,1000,,1,0,"].join("\n");
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0].messages.join(" ")).toMatch(/name/);
    }
  });

  it("accepts empty description", async () => {
    const csv = [HEADER, "SKU-1,Garri,Foods,1000,1000,,1,0,"].join("\n");
    const res = await parseProductCsv(csv);
    expect(res.ok).toBe(true);
  });
});

function makeXlsx(rows: (string | number)[][]): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");
  const buf = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buf], "products.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseProductFile (Excel)", () => {
  const headerRow = HEADER.split(",");

  it("parses a valid .xlsx workbook", async () => {
    const file = makeXlsx([
      headerRow,
      ["SKU-1", "Garri", "Foods", 1500, 1200, 12, 4, 0, "Tasty"],
      ["SKU-2", "Rice", "Foods", 4000, 2500, "", 3, 0, ""],
    ]);
    const res = await parseProductFile(file);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.rows).toHaveLength(2);
      expect(res.rows[0]).toMatchObject({
        sku: "SKU-1",
        name: "Garri",
        price_naira: 1500,
        weight_grams: 1200,
        units_per_carton: 12,
        cartons_delta: 4,
      });
    }
  });

  it("reports per-row error from an .xlsx workbook", async () => {
    const file = makeXlsx([
      headerRow,
      ["SKU-1", "Garri", "Foods", "abc", 1000, "", 1, 0, ""],
    ]);
    const res = await parseProductFile(file);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0].rowIndex).toBe(2);
      expect(res.errors[0].messages.join(" ")).toMatch(/price_naira/);
    }
  });

  it("still parses a .csv file via parseProductFile", async () => {
    const csv = [HEADER, "SKU-1,Garri,Foods,1500,1200,12,4,0,Tasty"].join("\n");
    const file = new File([csv], "products.csv", { type: "text/csv" });
    const res = await parseProductFile(file);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.rows).toHaveLength(1);
  });
});
