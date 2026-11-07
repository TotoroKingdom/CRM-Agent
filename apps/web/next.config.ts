import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  async rewrites() {
    const apiBaseUrl = (process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000").replace(
      /\/$/,
      "",
    );
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
