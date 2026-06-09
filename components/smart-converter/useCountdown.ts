'use client';

import { useNow } from '@/lib/hooks/useNow';
import { type CountdownParts, breakdown, relativePhrase } from '@/lib/smart-converter/countdown';

/**
 * Live countdown to an absolute instant. Re-renders once a second via the shared
 * `useNow` ticker (no per-card setInterval).
 */
export function useCountdown(targetMs: number): { parts: CountdownParts; phrase: string } {
  const now = useNow('second');
  const parts = breakdown(targetMs - now.toMillis());
  return { parts, phrase: relativePhrase(parts) };
}
