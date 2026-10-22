/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: { "/**": ["./data/demo.json"] },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  distDir: process.env.NEXT_DIST || ".next",
};
export default nextConfig;
