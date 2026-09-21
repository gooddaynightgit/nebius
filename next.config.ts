import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@aws-sdk/client-s3", "@vercel/blob", "jpeg-js"],
};

export default nextConfig;
