/**
 * One-time backfill: rewrite bare R2 object keys stored on products and
 * categories into full public CDN URLs (prepending R2_PUBLIC_BASE_URL).
 *
 * Idempotent — values that already look like a URL (full CDN URLs, legacy
 * Unsplash/placeholder URLs) are left untouched, so it is safe to re-run.
 *
 *   npm run backfill:image-urls
 *
 * Helpers are inlined (rather than imported from lib/r2) so the script runs
 * under tsx — lib/r2 pulls in "server-only", which throws outside an RSC build.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) throw new Error("R2_PUBLIC_BASE_URL not set");
  return `${base.replace(/\/$/, "")}/${key}`;
}

function toUrl(value: string): string {
  return looksLikeUrl(value) ? value : publicUrl(value);
}

async function backfillProducts() {
  const products = await db.product.findMany({ select: { id: true, images: true } });
  let rewritten = 0;
  for (const p of products) {
    const next = p.images.map(toUrl);
    const changed = next.some((v, i) => v !== p.images[i]);
    if (changed) {
      await db.product.update({ where: { id: p.id }, data: { images: next } });
      rewritten += 1;
    }
  }
  console.log(`Products: examined ${products.length}, rewritten ${rewritten}`);
}

async function backfillCategories() {
  const categories = await db.category.findMany({ select: { id: true, image: true } });
  let rewritten = 0;
  for (const c of categories) {
    if (!c.image) continue;
    const next = toUrl(c.image);
    if (next !== c.image) {
      await db.category.update({ where: { id: c.id }, data: { image: next } });
      rewritten += 1;
    }
  }
  console.log(`Categories: examined ${categories.length}, rewritten ${rewritten}`);
}

async function main() {
  await backfillProducts();
  await backfillCategories();
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
