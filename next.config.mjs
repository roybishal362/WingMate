/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: { "/**": ["./data/demo.json"] },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
};
export default nextConfig;
