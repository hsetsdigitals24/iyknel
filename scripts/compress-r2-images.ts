/**
 * Compress already-uploaded product/category images in R2.
 *
 *   npm run compress:r2-images             # dry run (report sizes, no writes)
 *   npm run compress:r2-images -- --commit # compress, re-upload, update DB
 *
 * Why: the originals are ~1.7 MB each (some 4 MB). Optimizing those on demand is
 * slow (esp. via the rate-limited pub-*.r2.dev host) and expensive in production.
 * This downloads each live image, resizes to fit within MAX_EDGE px at JPEG q80
 * (mozjpeg), uploads under a FRESH key, repoints the DB at the new URL, and deletes
 * the old object. Fresh keys bust every cache (browser, Next/Vercel optimizer).
 *
 * Idempotent: images already at/under SKIP_BYTES are left as-is, so re-running is a
 * no-op once compressed. Standalone (inline Prisma + S3) like the other scripts.
 */
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const db = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

const MAX_EDGE = 1600; // longest side, px
const QUALITY = 80;
const SKIP_BYTES = 350 * 1024; // already small enough → leave untouched

function r2(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID not set");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
const client = r2();
const BUCKET = process.env.R2_BUCKET;

function base(): string {
  const b = process.env.R2_PUBLIC_BASE_URL;
  if (!b) throw new Error("R2_PUBLIC_BASE_URL not set");
  return b.replace(/\/$/, "");
}

/** Extract the R2 object key from a stored URL/value, or null if not one of ours. */
function r2Key(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\//, "") || null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const path = url.pathname.replace(/^\//, "");
  if (url.hostname.endsWith(".r2.cloudflarestorage.com")) {
    const isVirtualHosted = url.hostname.split(".").length >= 5;
    if (isVirtualHosted) return path || null;
    const slash = path.indexOf("/");
    return slash >= 0 ? path.slice(slash + 1) || null : null;
  }
  if (/^(products|categories|invoices)\//.test(path)) return path;
  return null;
}

async function getBytes(key: string): Promise<Buffer> {
  const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

async function putJpeg(buf: Buffer, prefix: "products" | "categories"): Promise<string> {
  const key = `${prefix}/${randomUUID()}.jpg`;
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buf,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return key;
}

/** Returns the new public URL, or null if the source was already small enough. */
async function processOne(
  value: string,
  prefix: "products" | "categories",
): Promise<{ url: string; oldKey: string; saved: number } | null> {
  const oldKey = r2Key(value);
  if (!oldKey) return null; // external / placeholder — skip
  const original = await getBytes(oldKey);
  if (original.length <= SKIP_BYTES) return null; // already compressed

  const out = await sharp(original)
    .rotate() // honor EXIF orientation
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();

  if (!COMMIT) {
    return { url: value, oldKey, saved: original.length - out.length };
  }

  // Upload under a fresh key (so caches see a new URL), then best-effort delete the
  // old object once the new one is safely up.
  const newKey = await putJpeg(out, prefix);
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey })).catch(() => {});

  return { url: `${base()}/${newKey}`, oldKey, saved: original.length - out.length };
}

async function main() {
  if (!BUCKET) throw new Error("R2_BUCKET not set");
  console.log(
    COMMIT
      ? `COMMIT: compressing to ≤${MAX_EDGE}px q${QUALITY}, re-uploading, updating DB.`
      : `DRY RUN: reporting compression only (no uploads/DB writes).`,
  );

  let imgCount = 0;
  let processed = 0;
  let skippedSmall = 0;
  let savedBytes = 0;

  const products = await db.product.findMany({
    where: { NOT: { images: { equals: [] } } },
    select: { id: true, sku: true, images: true },
  });

  for (const p of products) {
    const nextUrls: string[] = [];
    let changed = false;
    for (const img of p.images) {
      imgCount++;
      try {
        const r = await processOne(img, "products");
        if (r) {
          processed++;
          savedBytes += r.saved;
          nextUrls.push(r.url);
          if (r.url !== img) changed = true;
        } else {
          skippedSmall++;
          nextUrls.push(img);
        }
      } catch (e) {
        console.warn(`  ${p.sku}: failed on ${img} — ${(e as Error).message}`);
        nextUrls.push(img);
      }
    }
    if (COMMIT && changed) {
      await db.product.update({ where: { id: p.id }, data: { images: nextUrls } });
    }
  }

  // categories
  const cats = await db.category.findMany({
    where: { NOT: { image: null } },
    select: { id: true, image: true },
  });
  for (const c of cats) {
    if (!c.image) continue;
    imgCount++;
    try {
      const r = await processOne(c.image, "categories");
      if (r) {
        processed++;
        savedBytes += r.saved;
        if (COMMIT && r.url !== c.image) {
          await db.category.update({ where: { id: c.id }, data: { image: r.url } });
        }
      } else skippedSmall++;
    } catch (e) {
      console.warn(`  category ${c.id}: failed — ${(e as Error).message}`);
    }
  }

  console.log(`\nImages seen:        ${imgCount}`);
  console.log(`  ${COMMIT ? "compressed" : "would compress"}: ${processed}`);
  console.log(`  skipped (small):  ${skippedSmall}`);
  console.log(`  est. saved:       ${(savedBytes / 1024 / 1024).toFixed(1)} MB`);
  if (!COMMIT) console.log(`\nRe-run with --commit to apply.`);
}

main()
  .catch((e) => {
    console.error("\ncompress-r2-images failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
