import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

import { getObjectBytes, keyFromPublicUrl } from "@/lib/r2";

// sharp needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

// Widths next/image may request (deviceSizes ∪ imageSizes). Anything else is
// rejected to bound the number of cached variants.
const ALLOWED_WIDTHS = new Set([
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
]);

// Only object keys under these prefixes are optimized — an SSRF guard so this
// route can never be used to transform arbitrary content.
const ALLOWED_PREFIXES = ["products/", "categories/"];

const IMMUTABLE_CACHE =
  "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const width = Number.parseInt(searchParams.get("w") ?? "", 10);
  const quality = Number.parseInt(searchParams.get("q") ?? "75", 10);

  if (!url) return new NextResponse("Bad request", { status: 400 });
  if (!Number.isFinite(width) || !ALLOWED_WIDTHS.has(width)) {
    // Unexpected width — don't break the image, just serve the original.
    return NextResponse.redirect(url, 302);
  }
  const q = Number.isFinite(quality) ? Math.min(100, Math.max(1, quality)) : 75;

  const key = keyFromPublicUrl(url);
  if (!key || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    // Not one of our own objects (legacy/external URL) — pass through untouched.
    return NextResponse.redirect(url, 302);
  }

  try {
    const original = await getObjectBytes(key);
    const out = await sharp(original)
      .rotate() // honor EXIF orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: q })
      .toBuffer();

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": IMMUTABLE_CACHE,
      },
    });
  } catch {
    // Object missing or undecodable — fall back to the original URL so the
    // image still renders instead of breaking.
    return NextResponse.redirect(url, 302);
  }
}
