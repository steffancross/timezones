import Link from 'next/link';
import { getNextTransition } from '@/lib/time/dst';
import { formatUtcOffset } from '@/lib/zones/offset';
import type { Zone } from '@/lib/zones/types';

/**
 * Single-zone DST note: either the next transition date (spring forward / fall
 * back) or a plain "no DST, constant offset" statement. The two-case reduction
 * of the pair page's four-case DSTNotes.
 */
export function ZoneDst({ zone }: { zone: Zone }) {
  const next = getNextTransition(zone.iana);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Daylight saving time</h2>
      <div className="mt-3 space-y-3 text-sm">
        {next ? (
          <p>
            {zone.display_name} observes daylight saving time. The next transition is on{' '}
            {next.date.toFormat('EEEE, MMMM d, yyyy')}, when clocks{' '}
            {next.direction === 'forward' ? 'spring forward' : 'fall back'} from{' '}
            {next.abbreviationBefore} to {next.abbreviationAfter}.
          </p>
        ) : (
          <p>
            {zone.display_name} does not observe daylight saving time — it stays at{' '}
            {formatUtcOffset(zone.utc_offset_std)} all year.
          </p>
        )}
        <p className="text-[color:var(--fg-muted)]">
          See the{' '}
          <Link
            prefetch={false}
            href="/dst"
            className="underline underline-offset-2 hover:text-[color:var(--fg)]"
          >
            daylight saving time page
          </Link>{' '}
          for transition dates across every time zone.
        </p>
      </div>
    </section>
  );
}
