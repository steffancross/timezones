import type { City } from '@/lib/cities/types';
import env from '@/lib/env';

interface Props {
  city: City;
}

/**
 * Place schema. Helps Google associate the page with the city entity for
 * Knowledge Graph + sitelinks.
 */
export function CitySchema({ city }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'City',
    name: city.name,
    containedInPlace: {
      '@type': 'Country',
      name: city.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: city.lat,
      longitude: city.lng,
    },
    url: `${env.NEXT_PUBLIC_BASE_URL}/time-in/${city.id}`,
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload built from typed City data
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
