import Link from 'next/link';
import type { City } from '@/lib/cities/types';

/**
 * Shared chip primitives for city + airport lists. Single source so the
 * /time-in (city) and /convert (pair) pages can't drift in styling again.
 * Border-only, no fill.
 */

/** Drop a trailing "Airport" — the surrounding section already says "Airports". */
function trimAirport(name: string): string {
  return name.replace(/\s+Airport$/i, '');
}

/** Linked city chip: name + country code. */
export function CityChip({ city }: { city: City }) {
  return (
    <li>
      <Link
        prefetch={false}
        href={`/time-in/${city.id}`}
        className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[color:var(--border)] px-3 py-1 text-sm hover:bg-[var(--hover)]"
      >
        <span>{city.name}</span>
        <span className="font-mono text-[10px] uppercase text-[color:var(--fg-muted)]">
          {city.country_code}
        </span>
      </Link>
    </li>
  );
}

/**
 * Code-forward airport chip: IATA code, optionally followed by the airport name.
 * Omit `name` for a code-only chip (pair pages). `title` carries optional
 * context (e.g. city) as a tooltip.
 */
export function AirportChip({
  iata,
  name,
  title,
}: {
  iata: string;
  name?: string;
  title?: string;
}) {
  return (
    <li
      title={title}
      className="rounded-[var(--radius)] border border-[color:var(--border)] px-3 py-1 text-sm"
    >
      <span className="font-mono font-medium">{iata}</span>
      {name ? <span className="text-[color:var(--fg-muted)]"> · {trimAirport(name)}</span> : null}
    </li>
  );
}
