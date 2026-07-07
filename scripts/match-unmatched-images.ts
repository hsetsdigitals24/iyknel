/**
 * Assisted image attach for products the STRICT matcher left "unmatched".
 *
 * Two-phase, human-in-the-loop workflow:
 *
 *   npm run match:unmatched-images                 # PHASE 1 — propose
 *       Fuzzy-matches every product that still has NO images against the files in
 *       ./product-images/ and writes ./image-proposals.csv for you to review/edit.
 *
 *   # ...open image-proposals.csv, fix the `image_file` column where the guess is
 *   #    wrong, clear it (leave blank) where there is no correct photo, or set
 *   #    multiple files separated by " | " ...
 *
 *   npm run match:unmatched-images -- --commit     # PHASE 2 — apply
 *       Reads image-proposals.csv back and uploads ONLY the files named in the
 *       `image_file` column to R2, then sets Product.images for each product.
 *
 * Unlike scripts/attach-product-images.ts (strict: every product word must appear
 * in the image name), phase 1 here is typo-tolerant — it scores partial token
 * overlap so near-miss spellings ("Spices"/"Spice", "Chili"/"Chilli", "Power"/
 * "Powder") still surface a candidate. Because fuzzy guesses can be wrong, nothing
 * is uploaded until you have reviewed image-proposals.csv and re-run with --commit.
 *
 * Prisma + S3 clients are inlined (not imported from lib/) for the same reason as
 * scripts/attach-product-images.ts: lib/db & lib/r2 pull in "server-only".
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const db = new PrismaClient();

const IMAGES_DIR = resolve(process.cwd(), "product-images");
const PROPOSALS = resolve(process.cwd(), "image-proposals.csv");
// Source of truth for which products still lack images, written by
// scripts/attach-product-images.ts. Used offline so proposing needs no DB.
const ATTACH_REPORT = resolve(process.cwd(), "image-attach-report.csv");
const COMMIT = process.argv.includes("--commit");

const ALLOWED_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 4;
// Minimum fraction of product line-words that must (fuzzily) appear in an image
// name for it to be proposed at all. Below this we report "no confident guess".
const MIN_SCORE = 0.6;

// ---- R2 (inlined; mirrors lib/r2.ts and attach-product-images.ts) ----

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

// ---- tokenisation (mirrors attach-product-images.ts) ----

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
  return new Set(m.map((x) => x.replace(/\s/g, "").replace(/ltrs?|litres?|lt/g, "l")));
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

// ---- fuzzy matching ----

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** A product word is "present" in an image's words if equal, a length≥4 prefix
 *  overlap, or within one edit (covers Spice/Spices, Chili/Chilli, Power/Powder). */
function tokenPresent(t: string, imgTokens: Set<string>): boolean {
  if (imgTokens.has(t)) return true;
  for (const it of imgTokens) {
    if (t.length >= 4 && it.length >= 4 && (it.startsWith(t) || t.startsWith(it))) return true;
    const maxLen = Math.max(t.length, it.length);
    if (maxLen >= 4 && levenshtein(t, it) <= 1) return true;
  }
  return false;
}

type ImageFile = { file: string; line: Set<string>; size: Set<string> };

type Candidate = { file: string; score: number; sizeMatch: boolean; extra: number };

/** Ranked fuzzy candidates for a product (best first). */
function rankCandidates(productName: string, images: ImageFile[]): Candidate[] {
  const pl = lineTokens(productName);
  if (pl.length < 2) return [];
  const ps = sizeTokens(productName);
  // First line word is the brand. Require it in the image to avoid confidently
  // mapping one brand's product onto a different brand's photo (Mamador→Kings,
  // Golden Penny sugar→Dangote sugar, etc.).
  const brand = pl[0];

  const scored: Candidate[] = [];
  for (const img of images) {
    if (!tokenPresent(brand, img.line)) continue;
    const matched = pl.filter((t) => tokenPresent(t, img.line)).length;
    const score = matched / pl.length;
    if (score < MIN_SCORE) continue;
    scored.push({
      file: img.file,
      score,
      sizeMatch: [...ps].some((s) => img.size.has(s)),
      extra: img.line.size, // fewer unrelated words = tighter match
    });
  }
  // Best score, then size match, then tightest line, then stable by name.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.sizeMatch) - Number(a.sizeMatch) ||
      a.extra - b.extra ||
      a.file.localeCompare(b.file),
  );
  return scored;
}

// ---- CSV helpers ----

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Minimal CSV parser (handles quoted cells, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch === "\r") { /* ignore */ }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}

// ---- phases ----

async function propose(images: ImageFile[]) {
  // Read the products still lacking images from the attach report (offline — no DB).
  if (!existsSync(ATTACH_REPORT)) {
    console.error(
      `\n${ATTACH_REPORT} not found.\n` +
        `Run "npm run attach:product-images" first to produce it.`,
    );
    process.exit(1);
  }
  const reportRows = parseCsv(readFileSync(ATTACH_REPORT, "utf8"));
  const reportHead = reportRows.shift();
  if (!reportHead || reportHead[0] !== "sku" || reportHead[2] !== "status") {
    console.error("\nUnexpected header in image-attach-report.csv.");
    process.exit(1);
  }
  const products = reportRows
    .filter((r) => r[2] === "unmatched")
    .map((r) => ({ sku: r[0], name: r[1] }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
  console.log(`${products.length} product(s) reported as unmatched (no images).\n`);

  const header = ["sku", "name", "confidence", "image_file", "alternates"];
  const lines = [header.join(",")];
  let proposed = 0;
  let none = 0;

  for (const p of products) {
    const ranked = rankCandidates(p.name, images);
    if (ranked.length === 0) {
      none++;
      lines.push([p.sku, p.name, "none", "", ""].map(csvCell).join(","));
      continue;
    }
    proposed++;
    const top = ranked[0];
    // Group same-product angles only when we can confirm the pack size: perfect
    // line match AND a size match. That keeps "(2)/(3)" duplicates of the right
    // size together while never lumping a different-size variant in. If the top
    // pick has no size confirmation, propose just the single best file.
    const sameProduct = top.sizeMatch
      ? ranked.filter((c) => c.score >= 0.999 && c.sizeMatch)
      : [];
    const primary = (sameProduct.length > 0 ? sameProduct : [top])
      .slice(0, MAX_IMAGES_PER_PRODUCT)
      .map((c) => c.file);
    const conf =
      top.score >= 0.999 ? (top.sizeMatch ? "high" : "medium") : "low";
    const alternates = ranked
      .filter((c) => !primary.includes(c.file))
      .slice(0, 3)
      .map((c) => c.file)
      .join(" | ");
    lines.push(
      [p.sku, p.name, conf, primary.join(" | "), alternates].map(csvCell).join(","),
    );
  }

  writeFileSync(PROPOSALS, lines.join("\n") + "\n", "utf8");
  console.log(`Proposal written → ${PROPOSALS}`);
  console.log(`  with a guess (review these): ${proposed}`);
  console.log(`  no confident guess:          ${none}`);
  console.log(
    `\nReview/edit the 'image_file' column (blank = skip, " | " separates multiple),` +
      `\nthen re-run:  npm run match:unmatched-images -- --commit`,
  );
}

async function commit() {
  if (!existsSync(PROPOSALS)) {
    console.error(`\n${PROPOSALS} not found. Run without --commit first to generate it.`);
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(PROPOSALS, "utf8"));
  const head = rows.shift();
  if (!head || head[0] !== "sku" || head[3] !== "image_file") {
    console.error("\nUnexpected header in image-proposals.csv. Regenerate it without --commit.");
    process.exit(1);
  }

  let attached = 0;
  let skipped = 0;
  let errored = 0;

  for (const r of rows) {
    const sku = r[0];
    const fileCell = (r[3] ?? "").trim();
    if (!fileCell) { skipped++; continue; }

    const files = fileCell.split("|").map((f) => f.trim()).filter(Boolean);
    const product = await db.product.findUnique({ where: { sku }, select: { id: true, images: true } });
    if (!product) {
      console.warn(`  skip ${sku}: no such product`);
      errored++;
      continue;
    }
    if (product.images.length > 0) {
      // Someone attached it since the proposal was generated — don't clobber.
      skipped++;
      continue;
    }

    try {
      const urls: string[] = [];
      for (const f of files.slice(0, MAX_IMAGES_PER_PRODUCT)) {
        const full = resolve(IMAGES_DIR, f);
        const ext = extname(f).toLowerCase();
        const type = ALLOWED_EXT[ext];
        if (!type) { console.warn(`  ${sku}: unsupported file "${f}"`); continue; }
        if (!existsSync(full)) { console.warn(`  ${sku}: missing file "${f}"`); continue; }
        const bytes = readFileSync(full).length;
        if (bytes > MAX_BYTES) {
          console.warn(`  ${sku}: "${f}" ${(bytes / 1024 / 1024).toFixed(1)} MB > 5 MB`);
          continue;
        }
        urls.push(await uploadImage(full, type));
      }
      if (urls.length === 0) { errored++; continue; }
      await db.product.update({ where: { id: product.id }, data: { images: urls } });
      attached++;
      console.log(`  attached ${sku} (${urls.length} image${urls.length > 1 ? "s" : ""})`);
    } catch (e) {
      errored++;
      console.warn(`  error on ${sku}: ${(e as Error).message}`);
    }
  }

  console.log(`\nDone.`);
  console.log(`  attached: ${attached}`);
  console.log(`  skipped (blank/already-has-images): ${skipped}`);
  if (errored) console.log(`  errors:   ${errored}`);
}

async function main() {
  let dirEntries: string[];
  try {
    dirEntries = readdirSync(IMAGES_DIR);
  } catch {
    console.error(
      `\nImage folder not found: ${IMAGES_DIR}\n` +
        `Extract the supplied images into ./product-images/ (flat image files) first.`,
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

  if (COMMIT) {
    console.log("COMMIT mode: uploading the files named in image-proposals.csv.\n");
    await commit();
  } else {
    console.log("PROPOSE mode: no uploads, no DB writes.\n");
    await propose(images);
  }
}

main()
  .catch((e) => {
    console.error("\nmatch-unmatched-images failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
