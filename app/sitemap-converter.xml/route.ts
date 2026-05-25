import env from '@/lib/env';
import { getCuratedPairSlugs } from '@/lib/sitemap/pair-slugs';

export const dynamic = 'force-static';

export function GET() {
  const slugs = getCuratedPairSlugs();
  const today = new Date().toISOString().slice(0, 10);

  const urls = slugs
    .map(
      (slug) =>
        `<url><loc>${env.NEXT_PUBLIC_BASE_URL}/convert/${slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
