import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/signup",
          "/settings",
          "/my-brackets",
          "/blindtest/*/play",
          "/blindtest/room/",
          "/battle-feat/room/",
          "/stream-clash/*/play",
          "/stream-clash/room/",
          "/api/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(),
  };
}
