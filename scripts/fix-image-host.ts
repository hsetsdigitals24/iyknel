/**
 * Re-point stored image URLs at the current R2 public host.
 *
 *   npm run fix:image-host             # dry run (report only)
 *   npm run fix:image-host -- --commit # rewrite the DB
 *
 * Why: image URLs were stored against the bucket's S3 API endpoint
 * (…r2.cloudflarestorage.com), which is NOT public and returns 400 Authorization.
 * This recomputes every Product.images[] / Category.image value from its R2 object
 * key against the current `R2_PUBLIC_BASE_URL` (e.g. a pub-<hash>.r2.dev domain or a
 * custom domain), so set that env var correctly first.
 *
 * Idempotent and host-agnostic: it understands the S3 endpoint forms (both
 * `<acct>.r2.cloudflarestorage.com/<bucket>/<key>` and the virtual-hosted
 * `<bucket>.<acct>.r2.cloudflarestorage.com/<key>`) and the `pub-*.r2.dev/<key>` /
 * custom-domain forms, so re-running after any future host change re-normalizes
 * everything. Non-R2 values (Unsplash, /placeholders/...) are left untouched.
 *
 * Standalone like the other scripts: inline PrismaClient because lib/r2 imports
 * "server-only", which throws under tsx. Env loads from .env.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

function base(): string {
  const b = process.env.R2_PUBLIC_BASE_URL;
  if (!b) throw new Error("R2_PUBLIC_BASE_URL not set");
  return b.replace(/\/$/, "");
}

/**
 * Extract the R2 object key (e.g. "products/<uuid>.jpg") from a stored value, or
 * null if it isn't one of our R2 objects (external URL, placeholder, bare key…).
 */
function r2Key(value: string): string | null {
  // Already a bare key (no scheme): treat the whole thing as the key.
  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\//, "") || null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname;
  const path = url.pathname.replace(/^\//, "");

  // S3 endpoint, path-style: <acct>.r2.cloudflarestorage.com/<bucket>/<key>
  // S3 endpoint, virtual-hosted: <bucket>.<acct>.r2.cloudflarestorage.com/<key>
  if (host.endsWith(".r2.cloudflarestorage.com")) {
    const labels = host.split(".");
    // virtual-hosted host has an extra leading <bucket> label (>= 4 labels:
    // bucket, acct, r2, cloudflarestorage, com => 5). path-style is acct.r2... (4).
    const isVirtualHosted = labels.length >= 5;
    if (isVirtualHosted) return path || null; // key is the whole path
    // path-style: strip the leading <bucket>/ segment
    const slash = path.indexOf("/");
    return slash >= 0 ? path.slice(slash + 1) || null : null;
  }

  // Public hosts: pub-<hash>.r2.dev or a custom domain bound to the bucket. The key
  // is the full path. Only treat known object prefixes as ours to avoid mangling
  // unrelated absolute URLs.
  if (/^(products|categories|invoices)\//.test(path)) {
    return path;
  }
  return null;
}

async function run() {
  console.log(
    COMMIT
      ? `COMMIT: rewriting image URLs to base ${base()}`
      : `DRY RUN (no writes). Target base: ${base()}`,
  );

  // ---- products ----
  const products = await db.product.findMany({ select: { id: true, sku: true, images: true } });
  let pChanged = 0;
  const samples: string[] = [];
  for (const p of products) {
    const next = p.images.map((v) => {
      const key = r2Key(v);
      return key ? `${base()}/${key}` : v;
    });
    const changed = next.length !== p.images.length || next.some((v, i) => v !== p.images[i]);
    if (!changed) continue;
    pChanged++;
    if (samples.length < 3) samples.push(`${p.sku}: ${p.images[0]} -> ${next[0]}`);
    if (COMMIT) await db.product.update({ where: { id: p.id }, data: { images: next } });
  }

  // ---- categories ----
  const categories = await db.category.findMany({ select: { id: true, image: true } });
  let cChanged = 0;
  for (const c of categories) {
    if (!c.image) continue;
    const key = r2Key(c.image);
    const next = key ? `${base()}/${key}` : c.image;
    if (next === c.image) continue;
    cChanged++;
    if (COMMIT) await db.category.update({ where: { id: c.id }, data: { image: next } });
  }

  console.log(`\nProducts: examined ${products.length}, ${COMMIT ? "rewritten" : "would rewrite"} ${pChanged}`);
  console.log(`Categories: examined ${categories.length}, ${COMMIT ? "rewritten" : "would rewrite"} ${cChanged}`);
  if (samples.length) {
    console.log(`\nSample rewrites:`);
    for (const s of samples) console.log(`  ${s}`);
  }
  if (!COMMIT) console.log(`\nRe-run with --commit to apply.`);
}

run()
  .catch((e) => {
    console.error("\nfix-image-host failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
