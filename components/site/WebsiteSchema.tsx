import env from '@/lib/env';

/**
 * WebSite schema with a SearchAction that surfaces the Google sitelinks
 * search box. Rendered on the home page only.
 */
export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: env.NEXT_PUBLIC_SITE_NAME,
    url: env.NEXT_PUBLIC_BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${env.NEXT_PUBLIC_BASE_URL}/cities?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must render as a raw script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
