import { greatCircleMiles, roundMiles } from '@/lib/geo/distance';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { resolveZoneForIana, zoneDisplayNameForIana } from '@/lib/zones/resolve';

interface Props {
  pair: ParsedPair;
}

function coords(zoc: ZoneOrCity): { lat: number; lng: number } {
  if (zoc.kind === 'zone') return { lat: zoc.zone.lat, lng: zoc.zone.lng };
  return { lat: zoc.city.lat, lng: zoc.city.lng };
}

function displayName(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

function zoneAbbreviations(zoc: ZoneOrCity): string[] {
  if (zoc.kind === 'zone') return zoc.zone.abbreviations;
  return resolveZoneForIana(zoc.city.iana)?.abbreviations ?? [];
}

function zoneDisplayName(zoc: ZoneOrCity): string {
  if (zoc.kind === 'zone') return zoc.zone.display_name;
  return zoneDisplayNameForIana(zoc.city.iana);
}

function aliasSentence(zoc: ZoneOrCity): string {
  const abbrevs = zoneAbbreviations(zoc);
  const zoneName = zoneDisplayName(zoc);
  if (zoc.kind === 'zone') {
    if (abbrevs.length === 0) return `${zoneName} has no common abbreviation.`;
    if (abbrevs.length === 1) return `${zoneName} is also known as ${abbrevs[0]}.`;
    const list = abbrevs.join(', ').replace(/, ([^,]+)$/, ', or $1');
    return `${zoneName} is also known as ${list}.`;
  }
  // City ref: ground it in the city → zone relationship.
  if (abbrevs.length === 0) return `${zoc.city.name} uses ${zoneName}.`;
  const list = abbrevs.join(', ').replace(/, ([^,]+)$/, ', or $1');
  return `${zoc.city.name} uses ${zoneName} (${list}).`;
}

export function PairZoneFacts({ pair }: Props) {
  const fromCoords = coords(pair.from);
  const toCoords = coords(pair.to);
  const miles = greatCircleMiles(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
  const rounded = roundMiles(miles);

  // For distance copy: when both sides are zones, we're really comparing their
  // representative locations. Use display_name on both sides to keep the
  // sentence honest.
  const fromName = displayName(pair.from);
  const toName = displayName(pair.to);

  return (
    <section>
      <h2 className="text-2xl font-semibold">About these zones</h2>
      <div className="mt-4 space-y-3 text-sm">
        <p>{aliasSentence(pair.from)}</p>
        <p>{aliasSentence(pair.to)}</p>
        <p className="text-[color:var(--fg-muted)]">
          {fromName} and {toName} are approximately {rounded.toLocaleString()} miles apart.
        </p>
      </div>
    </section>
  );
}
