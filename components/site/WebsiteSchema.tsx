import env from '@/lib/env';

/**
 * WebSite schema (name + url) — feeds Google's "site name" feature in results.
 * Rendered on the home page only.
 *
 * Previously carried a SearchAction for the sitelinks search box, but Google
 * deprecated that feature (removed globally 2024-11-21), so the markup was inert
 * and pointed at a non-functional `/cities?q=` endpoint. Dropped. The remaining
 * WebSite name/url is still supported.
 */
export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: env.NEXT_PUBLIC_SITE_NAME,
    url: env.NEXT_PUBLIC_BASE_URL,
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must render as a raw script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
