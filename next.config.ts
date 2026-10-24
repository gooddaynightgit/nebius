import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/how-to-feel-good", destination: "/app/joy", permanent: true }];
  },
  serverExternalPackages: ["@aws-sdk/client-s3", "@vercel/blob", "jpeg-js"],
};

export default nextConfig;
