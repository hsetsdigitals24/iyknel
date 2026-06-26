/**
 * One-off destructive wipe: removes ALL products and categories (and every row
 * that references them) so a fresh catalog can be uploaded.
 *
 *   npm run db:wipe-catalog
 *
 * This is a full fresh-start wipe — it also deletes orders, order items, stock
 * movements, cart items, wishlist items, reviews, and the product/category image
 * objects in R2. It is IRREVERSIBLE. Take a DB snapshot first.
 *
 * Idempotent: empty tables and already-deleted R2 keys are no-ops, so it is safe
 * to re-run.
 *
 * Like scripts/backfill-image-urls.ts, the Prisma + S3 clients are instantiated
 * directly (not imported from lib/db / lib/r2) because those modules pull in
 * "server-only", which throws outside an RSC build. Env vars (DATABASE_URL, R2_*)
 * are loaded from .env by Prisma's bundled dotenv, same as the seed/backfill.
 */
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  DeleteObjectsCommand,
  type ObjectIdentifier,
} from "@aws-sdk/client-s3";

const db = new PrismaClient();

// ---- R2 helpers (inlined; mirrors lib/r2.ts) ----

function r2Client(): S3Client {
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

/**
 * Derive the R2 object key from a stored image value. Returns null for values
 * that are NOT objects we own (external Unsplash images, local /placeholders/...,
 * anything outside our R2 bucket) so we never try to delete them.
 */
function ownKeyFromUrl(value: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (base && value.startsWith(base)) {
    return value.slice(base.length).replace(/^\//, "");
  }
  // R2 S3-endpoint style URL: https://<acct>.r2.cloudflarestorage.com/<bucket>/<key>
  const match = value.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+?)(?:\?|$)/);
  if (match) return match[1];
  return null; // external/placeholder — not ours
}

async function deleteR2Objects(keys: string[]): Promise<{ removed: number; failed: number }> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    console.warn("  R2_BUCKET not set — skipping R2 deletion.");
    return { removed: 0, failed: keys.length };
  }
  if (keys.length === 0) return { removed: 0, failed: 0 };

  const client = r2Client();
  let removed = 0;
  let failed = 0;

  // DeleteObjects accepts up to 1000 keys per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const Objects: ObjectIdentifier[] = batch.map((Key) => ({ Key }));
    try {
      const res = await client.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects, Quiet: true } }),
      );
      const errs = res.Errors ?? [];
      failed += errs.length;
      removed += batch.length - errs.length;
      for (const e of errs) {
        console.warn(`  R2 delete failed: ${e.Key} — ${e.Code}: ${e.Message}`);
      }
    } catch (e) {
      failed += batch.length;
      console.warn(`  R2 batch delete error: ${(e as Error).message}`);
    }
  }
  return { removed, failed };
}

// ---- main ----

async function main() {
  console.log("Collecting image references…");
  const [products, categories] = await Promise.all([
    db.product.findMany({ select: { images: true } }),
    db.category.findMany({ select: { image: true } }),
  ]);

  const rawUrls: string[] = [
    ...products.flatMap((p) => p.images),
    ...categories.map((c) => c.image).filter((v): v is string => Boolean(v)),
  ];

  const ownKeys = new Set<string>();
  let skipped = 0;
  for (const url of rawUrls) {
    const key = ownKeyFromUrl(url);
    if (key) ownKeys.add(key);
    else skipped++;
  }
  console.log(
    `  ${rawUrls.length} image reference(s): ${ownKeys.size} in our R2, ${skipped} external/placeholder (skipped).`,
  );

  console.log("\nDeleting database rows (FK-safe order, single transaction)…");
  const [
    stockMovements,
    auditLogs,
    cartItems,
    wishlistItems,
    orders,
    deletedProducts,
    deletedCategories,
  ] = await db.$transaction([
    db.stockMovement.deleteMany(),
    db.auditLog.deleteMany({ where: { orderId: { not: null } } }),
    db.cartItem.deleteMany(),
    db.wishlistItem.deleteMany(),
    db.order.deleteMany(), // cascades OrderItem, Invoice, Payment
    db.product.deleteMany(), // cascades Review
    db.category.deleteMany(),
  ]);

  console.log(`  stockMovements:  ${stockMovements.count}`);
  console.log(`  auditLogs(order):${auditLogs.count}`);
  console.log(`  cartItems:       ${cartItems.count}`);
  console.log(`  wishlistItems:   ${wishlistItems.count}`);
  console.log(`  orders:          ${orders.count} (+cascaded order items/invoices/payments)`);
  console.log(`  products:        ${deletedProducts.count} (+cascaded reviews)`);
  console.log(`  categories:      ${deletedCategories.count}`);

  console.log("\nDeleting R2 image objects…");
  const { removed, failed } = await deleteR2Objects([...ownKeys]);
  console.log(`  removed: ${removed}, failed: ${failed}`);

  console.log("\nDone. Catalog is empty — ready for a fresh upload.");
}

main()
  .catch((e) => {
    console.error("\nwipe-catalog failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
