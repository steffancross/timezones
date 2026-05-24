'use client';

import Link from 'next/link';
import { getZoneById } from '@/data/zones';
import { getCityById } from '@/lib/cities/resolve';
import type { ZoneRef } from '@/lib/store/converter';
import { useConverterStore } from '@/lib/store/converter';

interface Endpoint {
  slug: string;
  label: string;
  iana: string;
}

function refToEndpoint(ref: ZoneRef): Endpoint | null {
  if (ref.kind === 'zone') {
    try {
      const z = getZoneById(ref.slug);
      return { slug: z.id, label: z.id.toUpperCase(), iana: z.iana };
    } catch {
      return null;
    }
  }
  const c = getCityById(ref.slug);
  if (!c) return null;
  return { slug: c.id, label: c.name, iana: c.iana };
}

export function PairLinks() {
  const zones = useConverterStore((s) => s.zones);

  const home = zones[0] ? refToEndpoint(zones[0]) : null;
  if (!home) return null;

  const links = zones
    .slice(1)
    .map(refToEndpoint)
    .filter((e): e is Endpoint => e !== null && e.iana !== home.iana);

  if (links.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-semibold">Pair conversion pages</h2>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--fg-muted)]">
        Each pair page has the full conversion table, offsets, daylight savings behavior, when to
        schedule, and more.
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {links.map((other) => {
          const slug = `${home.slug}-to-${other.slug}`;
          return (
            <li key={slug}>
              <Link
                href={`/convert/${slug}`}
                className="inline-flex items-center rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-2.5 py-1 text-[13px] text-[color:var(--fg)] transition-colors hover:bg-[var(--hover)]"
              >
                {home.label} → {other.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[13px] text-[color:var(--fg-muted)]">
        <Link
          href="/conversions"
          className="underline decoration-[color:var(--border-strong)] underline-offset-4 hover:text-[color:var(--fg)] hover:decoration-[color:var(--fg)]"
        >
          See all conversions →
        </Link>
      </p>
    </section>
  );
}
