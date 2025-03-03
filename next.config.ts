import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  api: {
    responseLimit: false,
  },
};

export default nextConfig;
