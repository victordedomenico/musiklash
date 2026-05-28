import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATIC_SITEMAP_ROUTES, getSitemapBaseUrl } from "../lib/seo";

const base = getSitemapBaseUrl();
const lastmod = new Date().toISOString();

const urls = STATIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => {
  const loc = path === "/" ? base : `${base}${path}`;
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const out = join(process.cwd(), "public", "sitemap.xml");
writeFileSync(out, xml, "utf8");
console.log(`Wrote ${out} (${STATIC_SITEMAP_ROUTES.length} URLs)`);
