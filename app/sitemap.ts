import type { MetadataRoute } from "next";
import { getSitemapBaseUrl, STATIC_SITEMAP_ROUTES } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSitemapBaseUrl();
  return STATIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
    lastModified: new Date(),
  }));
}
