import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

let cached: S3Client | null = null;

function client() {
  if (cached) return cached;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID not set");
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cached;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "bin";
}

// R2 / S3 SigV4 caps presigned URLs at 7 days. We use 1 hour for browse-time
// URLs (page renders) and the full 7 days for URLs we embed in emails.
const ONE_HOUR_SECONDS = 60 * 60;
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
export const SIGNED_URL_EXPIRY = {
  short: ONE_HOUR_SECONDS,
  email: SEVEN_DAYS_SECONDS,
} as const;

/** Uploads to R2 under products/<uuid>.<ext> and returns the object key. */
export async function uploadProductImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is larger than 5 MB");
  }
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");

  const key = `products/${randomUUID()}.${extFor(file.type)}`;
  const body = Buffer.from(await file.arrayBuffer());
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return key;
}

/** Uploads the invoice PDF and returns the object key. */
export async function uploadInvoicePdf(orderNumber: string, buf: Buffer): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");

  const key = `invoices/${orderNumber}.pdf`;
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: "application/pdf",
      CacheControl: "private, max-age=0, must-revalidate",
    }),
  );
  return key;
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function extractKeyFromLegacyUrl(value: string): string | null {
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  if (publicBase && value.startsWith(publicBase)) {
    return value.slice(publicBase.length).replace(/^\//, "");
  }
  // Recognise R2 endpoint-style URLs.
  const match = value.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+?)(?:\?|$)/);
  if (match) return match[1];
  return null;
}

/**
 * Returns a presigned URL for the given object key. If `key` is already a full
 * URL (e.g. Unsplash seed images, legacy public URLs), it is returned unchanged.
 */
export async function getSignedFileUrl(
  key: string,
  opts?: { expiresIn?: number },
): Promise<string> {
  if (looksLikeUrl(key)) {
    // source.unsplash.com is deprecated and no longer resolves. Old seed rows
    // still contain those URLs; swap them for the local placeholder so pages
    // don't 500 from next/image rejecting an unconfigured remote host.
    if (key.includes("source.unsplash.com")) return "/placeholders/product.svg";
    return key;
  }
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: opts?.expiresIn ?? SIGNED_URL_EXPIRY.short },
  );
}

export async function resolveImage(
  key: string | null | undefined,
): Promise<string | null> {
  if (!key) return null;
  return getSignedFileUrl(key);
}

export async function resolveImages(keys: string[]): Promise<string[]> {
  return Promise.all(keys.map((k) => getSignedFileUrl(k)));
}

/** Delete by object key. */
export async function deleteFile(key: string) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) return;
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Backwards-compatible delete helper. Accepts either a fresh object key or a
 * legacy public URL stored before the switch to private R2.
 */
export async function deleteProductImage(keyOrUrl: string) {
  const key = looksLikeUrl(keyOrUrl) ? extractKeyFromLegacyUrl(keyOrUrl) : keyOrUrl;
  if (!key) return;
  await deleteFile(key);
}
