import { statSync } from 'node:fs';
import { join } from 'node:path';
import env from '@/lib/env';
import { getAllCitySlugs, getDisambiguationSlugs } from '@/lib/cities/resolve';

export const dynamic = 'force-static';

// lastmod reflects the most recent change to data/cities.json rather than
// the build date — so search engines only get a "this changed" signal when
// the city list actually changes (e.g. after `pnpm data:cities`).
function sourceLastMod(): string {
  const mtime = statSync(join(process.cwd(), 'data', 'cities.json')).mtimeMs;
  return new Date(mtime).toISOString().slice(0, 10);
}

export function GET() {
  const lastmod = sourceLastMod();

  const urls = [
    ...getAllCitySlugs().map(
      (slug) =>
        `<url><loc>${env.NEXT_PUBLIC_BASE_URL}/time-in/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    ),
    ...getDisambiguationSlugs().map(
      (slug) =>
        `<url><loc>${env.NEXT_PUBLIC_BASE_URL}/time-in/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
    ),
  ].join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
