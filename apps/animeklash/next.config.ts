import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: process.env.NODE_ENV === "production",
  transpilePackages: ["@klash/game-engine", "@klash/content-adapter", "@klash/auth", "@klash/i18n"],
  images: {
    remotePatterns: [
      // AniList CDN
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "media.kitsu.app" },
      // AnimeThemes
      { protocol: "https", hostname: "v1.animethemes.moe" },
      { protocol: "https", hostname: "staging.animethemes.moe" },
      // Fallback for user uploads
      { protocol: "https", hostname: "**.anilist.co" },
    ],
  },
};

export default nextConfig;
