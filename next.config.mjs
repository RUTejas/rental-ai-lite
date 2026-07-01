/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }, { key: "X-Content-Type-Options", value: "nosniff" }] },
      { source: "/manifest.json", headers: [{ key: "Content-Type", value: "application/manifest+json" }, { key: "Cache-Control", value: "public, max-age=3600" }] },
      { source: "/.well-known/assetlinks.json", headers: [{ key: "Content-Type", value: "application/json" }, { key: "Cache-Control", value: "public, max-age=300" }] }
    ];
  }
};

export default nextConfig;
