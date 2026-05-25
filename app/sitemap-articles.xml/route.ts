import env from '@/lib/env';
import { getAllArticles } from '@/lib/articles';

export const dynamic = 'force-static';

export async function GET() {
  const articles = await getAllArticles();
  const urls = articles
    .map((a) => {
      const lastmod = a.frontmatter.updated ?? a.frontmatter.published;
      return `<url><loc>${env.NEXT_PUBLIC_BASE_URL}/articles/${a.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
