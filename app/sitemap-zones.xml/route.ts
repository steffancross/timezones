import { statSync } from 'node:fs';
import { join } from 'node:path';
import { getAllZoneSlugs } from '@/data/zones';
import env from '@/lib/env';

export const dynamic = 'force-static';

// lastmod tracks the curated zone table, not the build date — engines only get
// a "changed" signal when data/zones.ts actually changes.
function sourceLastMod(): string {
  const mtime = statSync(join(process.cwd(), 'data', 'zones.ts')).mtimeMs;
  return new Date(mtime).toISOString().slice(0, 10);
}

export function GET() {
  const lastmod = sourceLastMod();

  const urls = getAllZoneSlugs()
    .map(
      (slug) =>
        `<url><loc>${env.NEXT_PUBLIC_BASE_URL}/timezone/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
