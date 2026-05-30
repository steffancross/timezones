'use client';

import { useEffect, useState } from 'react';
import { useNow } from '@/lib/hooks/useNow';
import { currentAbbreviation } from '@/lib/zones/abbreviation';

interface Props {
  iana: string;
}

/**
 * Large live clock for city pages. Ticks every second.
 *
 * Renders a placeholder until `mounted` is true to avoid SSR/client hydration
 * mismatch — server's "now" and client's "now" differ by request latency, and
 * with second granularity that mismatch is visible.
 */
export function HeroClock({ iana }: Props) {
  const [mounted, setMounted] = useState(false);
  const now = useNow('second');

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        role="status"
        aria-label="Loading current time"
        className="text-7xl font-light tabular-nums"
      >
        <span className="text-[color:var(--fg-muted)]">--:--:--</span>
      </div>
    );
  }

  const local = now.setZone(iana);
  const time = local.toFormat('h:mm:ss');
  const ampm = local.toFormat('a');
  const date = local.toFormat('cccc, MMMM d');
  const abbrev = currentAbbreviation(iana, local);
  const offset = local.toFormat('ZZ');

  return (
    <div>
      <div className="text-7xl font-light tabular-nums">
        {time}
        <span className="ml-2 text-3xl text-[color:var(--fg-muted)]">{ampm}</span>
      </div>
      <div className="mt-3 text-sm text-[color:var(--fg-muted)]">
        {date} · {abbrev} · {offset}
      </div>
    </div>
  );
}
