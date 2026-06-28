import { COUNTRY_INFO } from '@/lib/cities/countries';
import { getNextTransition } from '@/lib/time/dst';
import { formatUtcOffset } from '@/lib/zones/offset';
import type { Zone } from '@/lib/zones/types';

/**
 * At-a-glance reference facts for a single zone: UTC offset (standard and, when
 * applicable, daylight), abbreviations, DST behavior, and the countries that use
 * it. The single-zone counterpart to the pair page's comparative PairZoneFacts —
 * no distance/bearing math, since there's only one location.
 */
export function ZoneOffsetFacts({ zone }: { zone: Zone }) {
  const countryNames = zone.countries.map((c) => COUNTRY_INFO[c]?.name ?? c);
  const abbrevLabel = zone.abbreviations.length > 1 ? 'Abbreviations' : 'Abbreviation';
  // Derive DST from the live tz database (same source as ZoneDst/ZoneFaq) rather
  // than the static `observes_dst` boolean, so all three sections can't drift.
  // Gate the daylight-offset row on the same predicate to keep this table
  // internally consistent if a zone's IANA rules ever lose DST.
  const observesDst = getNextTransition(zone.iana) != null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">About {zone.display_name}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <FactRow label="Standard offset" value={formatUtcOffset(zone.utc_offset_std)} mono />
        {observesDst && zone.utc_offset_dst != null && (
          <FactRow label="Daylight offset" value={formatUtcOffset(zone.utc_offset_dst)} mono />
        )}
        <FactRow label={abbrevLabel} value={zone.abbreviations.join(', ')} />
        <FactRow label="Observes DST" value={observesDst ? 'Yes' : 'No'} />
      </dl>

      {countryNames.length > 0 && (
        <p className="mt-4 text-sm leading-relaxed">
          <span className="text-[color:var(--fg-muted)]">Used in: </span>
          {countryNames.join(', ')}.
        </p>
      )}
    </section>
  );
}

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[color:var(--fg-muted)]">{label}</dt>
      <dd className={mono ? 'font-medium tabular-nums' : 'font-medium'}>{value}</dd>
    </div>
  );
}
