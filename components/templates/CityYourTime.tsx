'use client';

import { useEffect, useState } from 'react';
import { useNow } from '@/lib/hooks/useNow';

interface Props {
  cityIana: string;
  visitorIana: string;
}

/**
 * "In your time zone, that's X:YY AM" — inline conversion from the city's
 * local time to the visitor's local time. Server passes `visitorIana` from
 * the cf-timezone header; client computes the display.
 *
 * Returns null until mounted so SSR doesn't render a misleading visitor time
 * (the server's clock is not the visitor's clock).
 */
export function CityYourTime({ cityIana: _cityIana, visitorIana }: Props) {
  const [mounted, setMounted] = useState(false);
  const now = useNow('minute');
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const visitorTime = now.setZone(visitorIana);
  const visitorLabel = visitorIana.split('/').pop()?.replace(/_/g, ' ') ?? visitorIana;

  return (
    <p className="text-sm text-[color:var(--fg-muted)]">
      In your time zone ({visitorLabel}), that's{' '}
      <span className="font-medium text-[color:var(--fg)] tabular-nums">
        {visitorTime.toFormat('h:mm a')}
      </span>
    </p>
  );
}
