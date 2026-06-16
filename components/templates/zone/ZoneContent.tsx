import { getZoneDescription } from '@/lib/zones/descriptions';
import type { Zone } from '@/lib/zones/types';
import { ConvertFromZone } from './ConvertFromZone';
import { ZoneCities } from './ZoneCities';
import { ZoneDaylight } from './ZoneDaylight';
import { ZoneDst } from './ZoneDst';
import { ZoneFaq } from './ZoneFaq';
import { ZoneOffsetFacts } from './ZoneOffsetFacts';
import { ZoneProse } from './ZoneProse';
import { ZoneQuirk } from './ZoneQuirk';

/**
 * Body of a zone reference page: structured facts first, then the prose and
 * optional quirk (the differentiator, when authored), DST, daylight, cities, the
 * convert-from launchpad, and FAQ. Mirrors CityContent's composition pattern.
 */
export function ZoneContent({ zone }: { zone: Zone }) {
  const description = getZoneDescription(zone.id);

  return (
    <article className="mt-12 space-y-10">
      <ZoneOffsetFacts zone={zone} />
      {description?.body && <ZoneProse body={description.body} />}
      {description?.quirk && <ZoneQuirk quirk={description.quirk} />}
      <ZoneDst zone={zone} />
      <ZoneDaylight zone={zone} />
      <ZoneCities zone={zone} />
      <ConvertFromZone zone={zone} />
      <ZoneFaq zone={zone} />
    </article>
  );
}
