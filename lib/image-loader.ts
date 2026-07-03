// Custom next/image loader. Routes remote R2 images through our self-hosted
// /api/img route, which fetches the original via the S3 API (bypassing the
// rate-limited r2.dev host), resizes + re-encodes to WebP with sharp, and is
// cached immutably on Vercel's edge. Runs on both server and client, so it must
// not import any server-only module.
export default function r2Loader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Local/public assets (placeholders, svgs, data URLs) pass through untouched.
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  return `/api/img?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
