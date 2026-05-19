'use client';

import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

/**
 * Tick granularity. Intentionally NOT including 'hour' — Luxon's `.set({ minute: 0 })`
 * truncates in the system zone, which produces wrong tick boundaries for zones with
 * non-whole-hour offsets (IST +5:30, IRST +3:30, NPT +5:45, NZ Chatham +12:45,
 * Newfoundland −2:30). 'minute' is fine because minute boundaries align across all
 * IANA zones. If hourly ticks are ever needed, compute them per-zone with
 * `DateTime.now().setZone(iana).set({ minute: 0 })`, not in this hook.
 */
export type Granularity = 'second' | 'minute';

const INTERVALS: Record<Granularity, number> = {
  second: 1000,
  minute: 60_000,
};

/**
 * Returns the current DateTime, re-rendering at the specified granularity.
 *
 * Use 'second' for big-display clocks (e.g., city page hero).
 * Use 'minute' for converter row labels and most other displays.
 */
export function useNow(granularity: Granularity = 'minute'): DateTime {
  const [now, setNow] = useState<DateTime>(() => truncate(DateTime.now(), granularity));

  useEffect(() => {
    function tick() {
      setNow(truncate(DateTime.now(), granularity));
    }

    const msUntilNextBoundary = msUntilNext(granularity);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, INTERVALS[granularity]);
    }, msUntilNextBoundary);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [granularity]);

  return now;
}

function truncate(dt: DateTime, granularity: Granularity): DateTime {
  switch (granularity) {
    case 'second':
      return dt.set({ millisecond: 0 });
    case 'minute':
      return dt.set({ second: 0, millisecond: 0 });
  }
}

function msUntilNext(granularity: Granularity): number {
  const now = Date.now();
  const interval = INTERVALS[granularity];
  return interval - (now % interval);
}
