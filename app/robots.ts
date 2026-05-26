import type { MetadataRoute } from 'next';
import env from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/ingest/'],
      },
    ],
    sitemap: `${env.NEXT_PUBLIC_BASE_URL}/sitemap-index.xml`,
    host: new URL(env.NEXT_PUBLIC_BASE_URL).host,
  };
}
