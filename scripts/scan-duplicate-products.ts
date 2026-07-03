/**
 * Read-only scan of the product catalog for:
 *   1. Duplicate SKUs (should be unique).
 *   2. Duplicate products by normalized name (likely accidental re-adds).
 *   3. Products with no images attached.
 *
 *   npm run scan:duplicates
 *
 * No writes. Standalone PrismaClient (lib/db imports "server-only", which throws
 * under tsx); env loads from .env.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const products = await db.product.findMany({
    select: { id: true, sku: true, name: true, images: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Loaded ${products.length} product(s).\n`);

  // 1. Duplicate SKUs ----------------------------------------------------------
  const bySku = new Map<string, typeof products>();
  for (const p of products) {
    const arr = bySku.get(p.sku) ?? [];
    arr.push(p);
    bySku.set(p.sku, arr);
  }
  const dupSku = [...bySku.entries()].filter(([, ps]) => ps.length > 1);
  console.log(`=== Duplicate SKUs: ${dupSku.length} sku(s), ${dupSku.reduce((n, [, ps]) => n + ps.length, 0)} rows ===`);
  for (const [sku, ps] of dupSku) {
    console.log(`  ${sku}  (${ps.length})`);
    for (const p of ps) {
      console.log(`     - ${p.id}  "${p.name}"  images:${p.images.length}  active:${p.active}  ${p.createdAt.toISOString().slice(0, 10)}`);
    }
  }

  // 2. Duplicate normalized names ---------------------------------------------
  const byName = new Map<string, typeof products>();
  for (const p of products) {
    const k = normName(p.name);
    const arr = byName.get(k) ?? [];
    arr.push(p);
    byName.set(k, arr);
  }
  const dupName = [...byName.entries()].filter(([, ps]) => ps.length > 1);
  console.log(`\n=== Duplicate names (normalized): ${dupName.length} name(s), ${dupName.reduce((n, [, ps]) => n + ps.length, 0)} rows ===`);
  for (const [, ps] of dupName) {
    console.log(`  "${ps[0].name}"  (${ps.length})`);
    for (const p of ps) {
      console.log(`     - ${p.sku}  ${p.id}  images:${p.images.length}  active:${p.active}  ${p.createdAt.toISOString().slice(0, 10)}`);
    }
  }

  // 3. Products with no images -------------------------------------------------
  const noImages = products.filter((p) => p.images.length === 0);
  console.log(`\n=== Products with NO images: ${noImages.length} ===`);
  for (const p of noImages) {
    console.log(`  ${p.sku}  "${p.name}"  active:${p.active}`);
  }

  // Summary --------------------------------------------------------------------
  console.log(`\n--- Summary ---`);
  console.log(`  products:            ${products.length}`);
  console.log(`  duplicate SKUs:      ${dupSku.length}`);
  console.log(`  duplicate names:     ${dupName.length}`);
  console.log(`  products w/o images: ${noImages.length}`);
}

main()
  .catch((e) => {
    console.error("\nscan-duplicate-products failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
