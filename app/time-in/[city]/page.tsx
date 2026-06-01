import { notFound } from 'next/navigation';
import { CityShell } from '@/components/templates/CityShell';
import { DisambiguationList } from '@/components/templates/DisambiguationList';
import {
  getAllCitySlugs,
  getCityById,
  getDisambiguation,
  getDisambiguationSlugs,
} from '@/lib/cities/resolve';
import { buildMetadata } from '@/lib/seo/metadata';

// Finite set: every valid city slug + every disambiguation slug. Anything
// else is genuinely a 404, not a long-tail page to render. No ISR — these all
// pre-build at deploy time.
export const dynamicParams = false;

export function generateStaticParams() {
  const citySlugs = getAllCitySlugs();
  const dabSlugs = getDisambiguationSlugs();
  return [...citySlugs, ...dabSlugs].map((city) => ({ city }));
}

function capitalize(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;

  // Disambiguation pages: self-canonical, indexable (per G10).
  const dab = getDisambiguation(city);
  if (dab) {
    return buildMetadata({
      title: `${capitalize(city)} — Choose a location`,
      description: `Multiple cities named ${capitalize(city)}. Select one to see the current local time and time zone.`,
      path: `/time-in/${city}`,
    });
  }

  const c = getCityById(city);
  if (!c) return { title: 'Not found' };

  return buildMetadata({
    title: `Current time in ${c.name}, ${c.country}`,
    description: `Current local time in ${c.name}, ${c.country}. Time zone: ${c.iana}. Includes sunrise, sunset, and conversions to other zones.`,
    path: `/time-in/${city}`,
  });
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;

  // Bare slug (e.g. 'cambridge') resolves to a disambiguation page listing
  // the qualified candidates. Check this BEFORE getCityById — bare slugs may
  // also accidentally match a city id (rare but possible).
  const dab = getDisambiguation(city);
  if (dab) {
    return <DisambiguationList bareSlug={city} qualifiedSlugs={dab} />;
  }

  const c = getCityById(city);
  if (!c) notFound();

  return <CityShell city={c} />;
}
