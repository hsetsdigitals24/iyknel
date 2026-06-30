/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve R2 images directly (already pre-compressed) instead of through Vercel's
    // /_next/image optimizer, which was returning 402 once its quota was exhausted.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
