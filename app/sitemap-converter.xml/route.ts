import { statSync } from 'node:fs';
import { join } from 'node:path';
import env from '@/lib/env';
import { getAllPairSlugs } from '@/lib/sitemap/pair-slugs';

export const dynamic = 'force-static';

// lastmod reflects the most recent change to the underlying data files
// (zones list or cities list) rather than the build date — search engines
// learn to ignore lastmod that ticks on every deploy.
function sourceLastMod(): string {
  const root = process.cwd();
  const sources = [join(root, 'data', 'zones.ts'), join(root, 'data', 'cities.json')];
  const latest = sources.reduce((acc, p) => Math.max(acc, statSync(p).mtimeMs), 0);
  return new Date(latest).toISOString().slice(0, 10);
}

export function GET() {
  const slugs = getAllPairSlugs();
  const lastmod = sourceLastMod();

  const urls = slugs
    .map(
      (slug) =>
        `<url><loc>${env.NEXT_PUBLIC_BASE_URL}/convert/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
