import type { MetadataRoute } from "next";
import { getSitemapBaseUrl } from "@/lib/seo";

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
          "/my-library",
          "/blindtest/*/play",
          "/blindtest/room/",
          "/battle-feat/room/",
          "/stream-clash/*/play",
          "/stream-clash/room/",
          "/api/",
        ],
      },
    ],
    sitemap: `${getSitemapBaseUrl()}/sitemap.xml`,
    host: getSitemapBaseUrl(),
  };
}
