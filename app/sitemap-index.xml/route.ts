import env from '@/lib/env';

export const dynamic = 'force-static';

// No <lastmod> on the index — each child sitemap reports honest per-URL
// dates derived from its source data. A stale build-date lastmod here would
// just train crawlers to ignore the signal.
export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap.xml</loc></sitemap>
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap-converter.xml</loc></sitemap>
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap-cities.xml</loc></sitemap>
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap-zones.xml</loc></sitemap>
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap-articles.xml</loc></sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
