import type { MetadataRoute } from "next";
import { STATIC_SITEMAP_ROUTES, getSitemapBaseUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSitemapBaseUrl();
  const now = new Date();

  return STATIC_SITEMAP_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
