import env from '@/lib/env';

export const dynamic = 'force-static';

export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap-converter.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap-cities.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${env.NEXT_PUBLIC_BASE_URL}/sitemap-articles.xml</loc><lastmod>${today}</lastmod></sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
