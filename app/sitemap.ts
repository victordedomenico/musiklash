import type { MetadataRoute } from "next";
import { STATIC_SITEMAP_ROUTES, getSitemapBaseUrl } from "@/lib/seo";

/** Sitemap statique uniquement — évite les erreurs 500 si la DB est indisponible. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSitemapBaseUrl();

  return STATIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
