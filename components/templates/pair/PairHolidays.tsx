import { DateTime } from 'luxon';
import { getHolidays, type Holiday, HOLIDAYS_YEAR } from '@/lib/holidays/resolve';
import { type ParsedPair, representativeCountry } from '@/lib/slugs/parse';

interface Props {
  pair: ParsedPair;
}

function formatDate(iso: string): string {
  return DateTime.fromISO(iso).toFormat('EEE, MMM d');
}

/**
 * Public-holiday calendars for each side's country — useful scheduling context
 * (a counterpart's national holiday is a day they're likely unavailable). Data
 * is baked at build time (data/holidays.json) for the current year; framed as a
 * year calendar, not an "upcoming" list, so it doesn't go stale mid-year.
 */
export function PairHolidays({ pair }: Props) {
  const seen = new Set<string>();
  const sides: { name: string; code: string; holidays: Holiday[] }[] = [];
  for (const side of [pair.from, pair.to]) {
    const country = representativeCountry(side);
    if (!country || seen.has(country.code)) continue;
    const holidays = getHolidays(country.code);
    if (holidays.length === 0) continue;
    seen.add(country.code);
    sides.push({ name: country.name, code: country.code, holidays });
  }

  if (sides.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Public holidays in {HOLIDAYS_YEAR}</h2>
      <p className="mt-3 text-sm text-[color:var(--fg-muted)]">
        National public holidays can affect availability — a counterpart is likely off work on their
        own holidays, so it's worth planning meetings and deadlines around them.
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {sides.map((side) => (
          <div key={side.code}>
            <h3 className="text-lg font-semibold">{side.name}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {side.holidays.map((h) => (
                <li key={h.date} className="flex justify-between gap-4">
                  <span>{h.name}</span>
                  <span className="shrink-0 tabular-nums text-[color:var(--fg-muted)]">
                    {formatDate(h.date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
