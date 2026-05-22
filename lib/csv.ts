import "server-only";
import Papa from "papaparse";
import { z } from "zod";

const optionalUnitsPerCarton = z
  .union([z.coerce.number().int().min(1).max(100_000), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v == null ? undefined : (v as number)));

export const productRowSchema = z.object({
  sku: z.string().min(1, "sku is required").max(60),
  name: z.string().min(2, "name is required").max(160),
  category: z.string().max(120).optional().or(z.literal("")),
  price_naira: z.coerce.number().nonnegative().max(10_000_000),
  weight_grams: z.coerce.number().int().nonnegative().max(50_000_000),
  units_per_carton: optionalUnitsPerCarton,
  cartons_delta: z.coerce.number().int().min(0).max(10_000_000).default(0),
  pieces_delta: z.coerce.number().int().min(0).max(10_000_000).default(0),
  description: z.string().max(2000).optional().or(z.literal("")),
});
export type ProductRow = z.infer<typeof productRowSchema>;

export type ProductRowError = { rowIndex: number; messages: string[] };

const REQUIRED_HEADERS = [
  "sku",
  "name",
  "category",
  "price_naira",
  "weight_grams",
  "units_per_carton",
  "cartons_delta",
  "pieces_delta",
  "description",
] as const;

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "_");
}

export type ParseResult =
  | { ok: true; rows: ProductRow[] }
  | { ok: false; errors: ProductRowError[]; message: string };

export async function parseProductCsv(input: string | File): Promise<ParseResult> {
  const text = typeof input === "string" ? input : await input.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalize,
  });

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      message: "CSV could not be parsed.",
      errors: parsed.errors.map((e) => ({ rowIndex: e.row ?? 0, messages: [e.message] })),
    };
  }
  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing header(s): ${missing.join(", ")}`,
      errors: [],
    };
  }

  const errors: ProductRowError[] = [];
  const rows: ProductRow[] = [];
  parsed.data.forEach((raw, i) => {
    const result = productRowSchema.safeParse(raw);
    if (result.success) rows.push(result.data);
    else {
      const issues = result.error.issues.map(
        (iss) => `${iss.path.join(".") || "row"}: ${iss.message}`,
      );
      errors.push({ rowIndex: i + 2, messages: issues });
    }
  });

  if (errors.length > 0) {
    return { ok: false, message: "Some rows are invalid.", errors };
  }
  return { ok: true, rows };
}
