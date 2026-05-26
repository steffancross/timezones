import type { MetadataRoute } from 'next';
import env from '@/lib/env';

/**
 * Top-level sitemap covering the static "index" pages. The bulk URLs
 * (converter pairs, cities, articles) live in dedicated child sitemaps —
 * see app/sitemap-{converter,cities,articles}.xml/route.ts.
 *
 * sitemap-index.xml stitches them together and is the URL submitted to
 * Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_BASE_URL;
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/cities`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/conversions`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/dst`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/articles`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
