/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // public/ assets aren't bundled into serverless functions by default, so the
    // invoice PDF renderer (lib/invoice/render.ts) fails at runtime reading fonts
    // and the logo via process.cwd(). Force-trace them into every function bundle.
    outputFileTracingIncludes: {
      "/**": ["./public/fonts/**", "./public/main_logo.png"],
    },
  },
  images: {
    // We don't use Vercel's /_next/image optimizer (it returned 402 once its quota
    // was exhausted). Instead a custom loader routes images through our own /_img
    // route, which fetches originals via the S3 API (bypassing the rate-limited
    // r2.dev host), resizes to WebP with sharp, and is cached immutably on Vercel's
    // edge — no optimizer billing, no r2.dev in the browser hot path.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
