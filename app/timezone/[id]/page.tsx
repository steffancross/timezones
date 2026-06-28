import { notFound } from 'next/navigation';
import { getAllZoneSlugs, zones } from '@/data/zones';
import { ZoneShell } from '@/components/templates/zone/ZoneShell';
import { getZoneDescription } from '@/lib/zones/descriptions';
import { formatUtcOffset } from '@/lib/zones/offset';
import { buildMetadata } from '@/lib/seo/metadata';

// Finite curated set (49 zones). Anything else is a genuine 404 — no ISR, all
// pre-build at deploy time, mirroring the city route.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllZoneSlugs().map((id) => ({ id }));
}

function findZone(id: string) {
  return zones.find((z) => z.id === id) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = findZone(id);
  if (!zone) return { title: 'Not found' };

  const abbr = zone.abbreviations[0] ?? zone.display_name;
  const description =
    getZoneDescription(id)?.summary ??
    `${zone.display_name} (${abbr}) is ${formatUtcOffset(zone.utc_offset_std)}. See the current time, daylight saving rules, major cities, and conversions to other zones.`;

  return buildMetadata({
    title: `${zone.display_name} (${abbr}) — current time & UTC offset`,
    description,
    path: `/timezone/${id}`,
  });
}

export default async function ZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = findZone(id);
  if (!zone) notFound();

  return <ZoneShell zone={zone} />;
}
