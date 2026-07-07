/**
 * Build a clean bulk-upload CSV from the source spreadsheet.
 *
 *   npm run build:product-upload
 *
 * Reads `Iyknel Website Product Listing.xlsx` (sheet "Website Products (1)" — the
 * complete, finalized dataset) and emits `products-upload.csv` at the repo root with
 * the exact headers the importer requires (see lib/csv.ts):
 *
 *   sku, name, category, price_naira, weight_grams, units_per_carton,
 *   cartons_delta, packs_delta, description
 *
 * Transformations:
 *   - weight_kg → weight_grams  (× 1000, rounded to an integer)
 *   - cartons/Pieces_delta      → packs_delta (loose packs); cartons_delta = 0
 *   - Sort_brands               → dropped (no brand field in the schema)
 *   - duplicate SKUs            → 2nd+ occurrence suffixed (-2, -3, …) so nothing is
 *                                 silently overwritten by the SKU-keyed upsert
 *   - price_naira               → kept in naira (the importer multiplies ×100)
 *
 * This is a pure read-the-xlsx / write-the-csv script — it never touches the DB or R2.
 * It re-declares the importer's Zod row schema inline because lib/csv.ts does
 * `import "server-only"`, which throws outside an RSC build (same reason the other
 * scripts inline their helpers).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { z } from "zod";

const SRC = resolve(process.cwd(), "Iyknel Website Product Listing.xlsx");
const SHEET = "Website Products (1)";
const OUT = resolve(process.cwd(), "products-upload.csv");

// Output columns, in importer order.
const HEADERS = [
  "sku",
  "name",
  "category",
  "price_naira",
  "weight_grams",
  "units_per_carton",
  "cartons_delta",
  "packs_delta",
  "description",
] as const;

// Mirror of productRowSchema in lib/csv.ts so the generated CSV is guaranteed to pass.
const rowSchema = z.object({
  sku: z.string().min(1, "sku is required").max(60),
  name: z.string().min(2, "name is required").max(160),
  category: z.string().max(120).optional().or(z.literal("")),
  price_naira: z.coerce.number().nonnegative().max(10_000_000),
  weight_grams: z.coerce.number().int().nonnegative().max(50_000_000),
  cartons_delta: z.coerce.number().int().min(0).max(10_000_000),
  packs_delta: z.coerce.number().int().min(0).max(10_000_000),
  description: z.string().max(2000).optional().or(z.literal("")),
});

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main() {
  const wb = XLSX.readFile(SRC);
  const sheet = wb.Sheets[SHEET];
  if (!sheet) throw new Error(`Sheet "${SHEET}" not found in ${SRC}`);

  // Header row: product name, SKUs, price_naira, sort_category, Sort_brands,
  //             weight_kg, cartons/Pieces_delta, descriptions
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    blankrows: false,
  });
  const dataRows = raw.slice(1).filter((r) =>
    r.some((c) => c != null && String(c).trim() !== ""),
  );

  const seenSku = new Map<string, number>();
  const suffixed: Array<{ original: string; assigned: string; name: string }> = [];
  const catCounts = new Map<string, number>();
  const errors: Array<{ rowIndex: number; messages: string[] }> = [];
  const out: Array<Record<(typeof HEADERS)[number], string | number>> = [];

  dataRows.forEach((r, i) => {
    const name = str(r[0]);
    let sku = str(r[1]);
    const priceNaira = num(r[2]);
    const category = str(r[3]);
    // r[4] = Sort_brands — intentionally dropped
    const weightKg = num(r[5]);
    const packsDelta = num(r[6]);
    const description = str(r[7]);

    // Deduplicate SKUs: keep the first as-is, suffix later collisions.
    const count = (seenSku.get(sku) ?? 0) + 1;
    seenSku.set(sku, count);
    if (count > 1) {
      const assigned = `${sku}-${count}`;
      suffixed.push({ original: sku, assigned, name });
      sku = assigned;
    }

    const record = {
      sku,
      name,
      category,
      price_naira: Number.isFinite(priceNaira) ? priceNaira : NaN,
      weight_grams: Number.isFinite(weightKg) ? Math.round(weightKg * 1000) : NaN,
      units_per_carton: "" as const,
      cartons_delta: 0,
      packs_delta: Number.isFinite(packsDelta) ? Math.round(packsDelta) : 0,
      description,
    };

    const parsed = rowSchema.safeParse(record);
    if (!parsed.success) {
      errors.push({
        rowIndex: i + 2, // +1 for header, +1 for 1-based
        messages: parsed.error.issues.map(
          (iss) => `${iss.path.join(".") || "row"}: ${iss.message}`,
        ),
      });
      return;
    }

    if (category) catCounts.set(category, (catCounts.get(category) ?? 0) + 1);
    out.push(record);
  });

  if (errors.length > 0) {
    console.error(`\n${errors.length} row(s) failed validation — nothing written:\n`);
    for (const e of errors) {
      console.error(`  row ${e.rowIndex}: ${e.messages.join("; ")}`);
    }
    process.exit(1);
  }

  const lines = [
    HEADERS.join(","),
    ...out.map((row) => HEADERS.map((h) => csvCell(row[h])).join(",")),
  ];
  writeFileSync(OUT, lines.join("\n") + "\n", "utf8");

  // ---- summary ----
  console.log(`Wrote ${out.length} product row(s) → ${OUT}`);
  console.log(`\nAuto-suffixed duplicate SKUs: ${suffixed.length}`);
  for (const s of suffixed) {
    console.log(`  ${s.original} → ${s.assigned}  (${s.name})`);
  }
  const cats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
  const blankCat = out.filter((r) => !r.category).length;
  console.log(`\nCategories (${cats.length}${blankCat ? `, +${blankCat} uncategorized` : ""}):`);
  for (const [name, n] of cats) console.log(`  ${name}: ${n}`);
}

main();
