import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@klash/game-engine", "@klash/content-adapter", "@klash/auth", "@klash/i18n"],
  // React Compiler only in production — heavy Babel transform useless in dev
  reactCompiler: process.env.NODE_ENV === "production",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "e-cdns-images.dzcdn.net" },
      { protocol: "https", hostname: "cdns-images.dzcdn.net" },
      { protocol: "https", hostname: "api.deezer.com" },
    ],
  },
};

export default nextConfig;
