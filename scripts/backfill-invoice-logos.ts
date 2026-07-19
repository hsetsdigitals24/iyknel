/**
 * One-time backfill: re-render every already-issued invoice PDF and replace it
 * in R2, so historical invoices pick up presentation changes (the business logo,
 * the Naira-glyph font) that were added after they were first generated.
 *
 * Only money/state-neutral: nothing but the stored `pdfKey` is touched, and the
 * old object is deleted afterwards. Idempotent — safe to re-run.
 *
 *   npm run backfill:invoice-logos
 *
 * Rendering + R2 upload are inlined (rather than imported from lib/orders /
 * lib/r2 / lib/invoice/render) because those modules import "server-only", which
 * throws under tsx. Only lib/invoice/pdf (pure react-pdf) is imported directly.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { renderToBuffer, Font } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceProps } from "../lib/invoice/pdf";

const db = new PrismaClient();

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Inter-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

function loadLogo(): Buffer | undefined {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", "main_logo.png"));
  } catch {
    return undefined;
  }
}

function r2() {
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

async function uploadInvoice(client: S3Client, buf: Buffer): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");
  const key = `invoices/${randomUUID()}.pdf`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: "application/pdf",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return key;
}

async function main() {
  const client = r2();
  const bucket = process.env.R2_BUCKET;
  const logo = loadLogo();
  if (!logo) console.warn("Warning: public/main_logo.png not found — PDFs will render without a logo.");

  // Singleton settings, read once — mirrors getSiteSettings() / bankFromSettings().
  const settings = await db.siteSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  const company = {
    address: [
      settings.contactAddressLine1,
      settings.contactAddressLine2,
      settings.contactAddressLga,
      settings.contactAddressState,
    ]
      .filter(Boolean)
      .join(", "),
    phones: settings.contactPhones
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .join(" · "),
    email: settings.contactEmail,
  };
  const bank =
    settings.bankName && settings.bankAccountName && settings.bankAccountNumber
      ? {
          name: settings.bankName,
          accountName: settings.bankAccountName,
          accountNumber: settings.bankAccountNumber,
        }
      : null;

  // Only invoices whose order has a resolved vehicle + band can be re-rendered
  // faithfully (issuance always sets both, so this is every real invoice).
  const invoices = await db.invoice.findMany({
    include: {
      order: {
        include: { items: true, address: true, vehicle: true, distanceBand: true },
      },
    },
  });

  let rewritten = 0;
  let skipped = 0;
  for (const inv of invoices) {
    const order = inv.order;
    if (!order || !order.vehicleId || !order.distanceBandId) {
      skipped += 1;
      continue;
    }

    const business = await db.business.findUnique({ where: { userId: order.userId } });
    const user = await db.user.findUnique({ where: { id: order.userId } });

    const props: InvoiceProps = {
      invoiceNumber: `INV-${order.number}`,
      issuedAt: inv.issuedAt,
      company,
      business: {
        name: business?.name ?? user?.name ?? "Customer",
        contactName: business?.contactName ?? user?.name ?? "",
        phone: business?.phone ?? user?.phone ?? "",
      },
      address: order.address
        ? {
            line1: order.address.line1,
            line2: order.address.line2,
            city: order.address.city,
            state: order.address.state,
          }
        : null,
      items: order.items.map((i) => ({
        nameSnapshot: i.nameSnapshot,
        skuSnapshot: i.skuSnapshot,
        quantity: i.quantity,
        quantityCartons: i.quantityCartons,
        quantityPacks: i.quantityPacks,
        unitsPerCartonSnap: i.unitsPerCartonSnap,
        priceKoboSnap: i.priceKoboSnap,
      })),
      subtotalKobo: order.subtotalKobo,
      logisticsKobo: order.logisticsKobo,
      totalKobo: order.subtotalKobo + order.logisticsKobo,
      logo,
      weightGrams: order.weightGrams,
      vehicleName: order.vehicle?.name ?? null,
      bandLabel: order.distanceBand?.label ?? null,
      tripCount: order.tripCount,
      bank,
    };

    const buf = await renderToBuffer(InvoiceDocument(props));
    const previousKey = inv.pdfKey ?? null;
    const key = await uploadInvoice(client, buf);
    await db.invoice.update({ where: { id: inv.id }, data: { pdfKey: key } });

    if (previousKey && previousKey !== key && bucket) {
      await client
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: previousKey }))
        .catch((e) => console.warn(`  could not delete old key ${previousKey}:`, e));
    }
    rewritten += 1;
    console.log(`Regenerated ${props.invoiceNumber} → ${key}`);
  }

  console.log(`\nInvoices: examined ${invoices.length}, rewritten ${rewritten}, skipped ${skipped}`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
