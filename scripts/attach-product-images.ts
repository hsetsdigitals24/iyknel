/**
 * Attach product images from a local folder to products already in the DB.
 *
 *   npm run attach:product-images            # dry run (report only, no writes)
 *   npm run attach:product-images -- --commit  # upload to R2 + update Product.images
 *   npm run attach:product-images -- --commit --force  # also re-attach products that
 *                                                       # already have images
 *
 * Prerequisites:
 *   1. Products already exist in the DB (upload products-upload.csv via
 *      /admin/products/bulk-upload). This script matches/updates by SKU + name.
 *   2. Images extracted from the supplied zip into ./product-images/ (flat .jpg files).
 *
 * Matching is intentionally STRICT (high-confidence only): a product matches an image
 * only when the product's brand + every product-line word also appears in the image
 * name. Pack size is used as a tiebreak. Products with no confident match are left
 * untouched (never forced onto a wrong photo).
 *
 * Like scripts/wipe-catalog.ts, the Prisma + S3 clients are instantiated directly
 * (not imported from lib/db / lib/r2) because those modules pull in "server-only",
 * which throws outside an RSC build. Env (DATABASE_URL, R2_*) loads from .env.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const db = new PrismaClient();

const IMAGES_DIR = resolve(process.cwd(), "product-images");
const REPORT = resolve(process.cwd(), "image-attach-report.csv");
const COMMIT = process.argv.includes("--commit");
const FORCE = process.argv.includes("--force");

const ALLOWED_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 4;

// ---- R2 (inlined; mirrors lib/r2.ts) ----

let cachedClient: S3Client | null = null;
function r2(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID not set");
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cachedClient;
}

function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) throw new Error("R2_PUBLIC_BASE_URL not set");
  return `${base.replace(/\/$/, "")}/${key}`;
}

async function uploadImage(filePath: string, contentType: string): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `products/${randomUUID()}.${ext}`;
  await r2().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(filePath),
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return publicUrl(key);
}

// ---- matching ----

const STOP = new Set([
  "foods", "food", "by", "x", "carton", "cartons", "pack", "packs", "pcs", "rf", "sup",
  "and", "the", "premium", "tin", "bucket",
]);

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SIZE_RE = /[0-9]+(\.[0-9]+)?\s?(kg|g|l|lt|ltr|ltrs|litre|litres|ml|cl)\b/g;

function sizeTokens(s: string): Set<string> {
  const m = norm(s).match(SIZE_RE) ?? [];
  return new Set(
    m.map((x) => x.replace(/\s/g, "").replace(/ltrs?|litres?|lt/g, "l")),
  );
}

function lineTokens(s: string): string[] {
  return [
    ...new Set(
      norm(s)
        .replace(SIZE_RE, " ")
        .split(" ")
        .filter((t) => t && !STOP.has(t) && !/^[0-9]+$/.test(t)),
    ),
  ];
}

type ImageFile = { file: string; line: Set<string>; size: Set<string> };

/** Strict match → ordered list of image files for this product, or []. */
function matchImages(productName: string, images: ImageFile[]): string[] {
  const pl = lineTokens(productName);
  if (pl.length < 2) return [];
  const ps = sizeTokens(productName);

  const candidates = images
    .filter((img) => pl.every((t) => img.line.has(t)))
    .map((img) => ({
      file: img.file,
      sizeMatch: [...ps].some((s) => img.size.has(s)),
      lineSize: img.line.size,
    }));
  if (candidates.length === 0) return [];

  // Prefer images whose pack size matches the product; if any do, keep only those.
  const sized = candidates.filter((c) => c.sizeMatch);
  const pool = sized.length > 0 ? sized : candidates;
  // Tighter line match (fewer extra words) first, then stable by name.
  pool.sort((a, b) => a.lineSize - b.lineSize || a.file.localeCompare(b.file));
  return pool.slice(0, MAX_IMAGES_PER_PRODUCT).map((c) => c.file);
}

// ---- main ----

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

async function main() {
  console.log(
    COMMIT
      ? `COMMIT mode${FORCE ? " (--force)" : ""}: will upload to R2 and update the DB.`
      : "DRY RUN: no uploads, no DB writes. Re-run with --commit to apply.",
  );

  let dirEntries: string[];
  try {
    dirEntries = readdirSync(IMAGES_DIR);
  } catch {
    console.error(
      `\nImage folder not found: ${IMAGES_DIR}\n` +
        `Extract the supplied zip into ./product-images/ (flat .jpg files) first.`,
    );
    process.exit(1);
  }

  const images: ImageFile[] = dirEntries
    .filter((f) => ALLOWED_EXT[extname(f).toLowerCase()])
    .map((f) => {
      const stem = basename(f, extname(f));
      return { file: f, line: new Set(lineTokens(stem)), size: sizeTokens(stem) };
    });
  console.log(`Found ${images.length} image file(s) in ${IMAGES_DIR}.`);

  const products = await db.product.findMany({
    select: { id: true, sku: true, name: true, images: true },
    orderBy: { sku: "asc" },
  });
  console.log(`Loaded ${products.length} product(s) from the DB.\n`);

  type Row = { sku: string; name: string; status: string; images: string };
  const rows: Row[] = [];
  let attached = 0;
  let skippedExisting = 0;
  let unmatched = 0;
  let errored = 0;

  for (const p of products) {
    if (p.images.length > 0 && !FORCE) {
      skippedExisting++;
      rows.push({ sku: p.sku, name: p.name, status: "skipped-existing", images: p.images.join(" | ") });
      continue;
    }

    const files = matchImages(p.name, images);
    if (files.length === 0) {
      unmatched++;
      rows.push({ sku: p.sku, name: p.name, status: "unmatched", images: "" });
      continue;
    }

    if (!COMMIT) {
      attached++;
      rows.push({ sku: p.sku, name: p.name, status: "would-attach", images: files.join(" | ") });
      continue;
    }

    try {
      const urls: string[] = [];
      for (const f of files) {
        const full = resolve(IMAGES_DIR, f);
        const ext = extname(f).toLowerCase();
        const type = ALLOWED_EXT[ext];
        const bytes = readFileSync(full).length;
        if (bytes > MAX_BYTES) {
          console.warn(`  skip ${f}: ${(bytes / 1024 / 1024).toFixed(1)} MB > 5 MB`);
          continue;
        }
        urls.push(await uploadImage(full, type));
      }
      if (urls.length === 0) {
        errored++;
        rows.push({ sku: p.sku, name: p.name, status: "error", images: "all candidates too large" });
        continue;
      }
      await db.product.update({ where: { id: p.id }, data: { images: urls } });
      attached++;
      rows.push({ sku: p.sku, name: p.name, status: "attached", images: urls.join(" | ") });
    } catch (e) {
      errored++;
      rows.push({ sku: p.sku, name: p.name, status: "error", images: (e as Error).message });
      console.warn(`  error on ${p.sku}: ${(e as Error).message}`);
    }
  }

  const header = "sku,name,status,images";
  const lines = [
    header,
    ...rows.map((r) => [r.sku, r.name, r.status, r.images].map(csvCell).join(",")),
  ];
  writeFileSync(REPORT, lines.join("\n") + "\n", "utf8");

  console.log(`\nReport written → ${REPORT}`);
  console.log(`  ${COMMIT ? "attached" : "would-attach"}: ${attached}`);
  console.log(`  skipped-existing: ${skippedExisting}`);
  console.log(`  unmatched:        ${unmatched}`);
  if (errored) console.log(`  errors:           ${errored}`);
  if (!COMMIT) console.log(`\nReview the report, then re-run with --commit to apply.`);
}

main()
  .catch((e) => {
    console.error("\nattach-product-images failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
