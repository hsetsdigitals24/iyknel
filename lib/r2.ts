import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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

// Files are served via R2 public access (R2_PUBLIC_BASE_URL — a pub-*.r2.dev URL
// or a custom domain bound to the bucket). Public URLs never expire, unlike
// SigV4 presigned URLs which R2/S3 caps at 7 days. These constants are retained
// for the (now no-op) `expiresIn` option some callers still pass.
const ONE_HOUR_SECONDS = 60 * 60;
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
export const SIGNED_URL_EXPIRY = {
  short: ONE_HOUR_SECONDS,
  email: SEVEN_DAYS_SECONDS,
} as const;

/** Builds a non-expiring public URL for an object key. */
function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) throw new Error("R2_PUBLIC_BASE_URL not set");
  return `${base.replace(/\/$/, "")}/${key}`;
}

/** Uploads to R2 under products/<uuid>.<ext> and returns the public CDN URL. */
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
  return publicUrl(key);
}

/** Uploads to R2 under categories/<uuid>.<ext> and returns the public CDN URL. */
export async function uploadCategoryImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is larger than 5 MB");
  }
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");

  const key = `categories/${randomUUID()}.${extFor(file.type)}`;
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
  return publicUrl(key);
}

/** Uploads the invoice PDF and returns the object key. */
export async function uploadInvoicePdf(buf: Buffer): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");

  // Unguessable key: invoices contain customer PII and are served via public
  // URLs, so we must not key them on the (enumerable) order number.
  const key = `invoices/${randomUUID()}.pdf`;
  await client().send(
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

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * If `value` is a full URL on the (non-public) R2 S3 API endpoint
 * (`*.r2.cloudflarestorage.com`), return its object key so it can be re-pointed at
 * the public base. Handles both the virtual-hosted form
 * (`<bucket>.<acct>.r2.cloudflarestorage.com/<key>`) and the path-style form
 * (`<acct>.r2.cloudflarestorage.com/<bucket>/<key>`). Returns null otherwise.
 */
function keyFromR2EndpointUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!url.hostname.endsWith(".r2.cloudflarestorage.com")) return null;
  const path = url.pathname.replace(/^\//, "");
  const isVirtualHosted = url.hostname.split(".").length >= 5;
  if (isVirtualHosted) return path || null;
  const slash = path.indexOf("/");
  return slash >= 0 ? path.slice(slash + 1) || null : null;
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
 * Returns a non-expiring public URL for the given object key. If `key` is
 * already a full URL (e.g. Unsplash seed images, legacy public URLs), it is
 * returned unchanged. The `expiresIn` option is accepted for backwards
 * compatibility but ignored — public URLs do not expire.
 */
export async function getSignedFileUrl(
  key: string,
  _opts?: { expiresIn?: number },
): Promise<string> {
  if (looksLikeUrl(key)) {
    // source.unsplash.com is deprecated and no longer resolves. Old seed rows
    // still contain those URLs; swap them for the local placeholder so pages
    // don't 500 from next/image rejecting an unconfigured remote host.
    if (key.includes("source.unsplash.com")) return "/placeholders/product.svg";
    // Repair URLs stored against the non-public S3 API endpoint by re-pointing
    // them at the public base. No-op for already-public URLs.
    const endpointKey = keyFromR2EndpointUrl(key);
    if (endpointKey) return publicUrl(endpointKey);
    return key;
  }
  return publicUrl(key);
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
