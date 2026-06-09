'use client';

import type { CountdownParts } from '@/lib/smart-converter/countdown';

type Seg = 'd' | 'h' | 'm' | 's';

interface Props {
  parts: CountdownParts;
  /** px size of the numbers. */
  size?: number;
  segs?: Seg[];
  /** Accessible label describing what the countdown is to. */
  label?: string;
}

/**
 * Big d/h/m/s countdown. Presentational — the parent recomputes `parts` each
 * second (via useNow) and passes them in. Announced politely for screen readers.
 */
export function Countdown({ parts, size = 33, segs = ['d', 'h', 'm', 's'], label }: Props) {
  const map: Record<Seg, number> = { d: parts.d, h: parts.h, m: parts.m, s: parts.s };
  const pad = (n: number, u: Seg) => (u === 'd' ? String(n) : String(n).padStart(2, '0'));
  return (
    <span
      className="sc-cd-num"
      style={{ fontSize: size }}
      role="timer"
      // Don't announce every tick — the absolute converted date/time beside it is
      // the value a screen reader needs; per-second live updates would be noise.
      aria-live="off"
      aria-label={label ? `${segs.map((u) => `${map[u]} ${u}`).join(', ')} ${label}` : undefined}
    >
      {segs.map((u) => (
        <span className="sc-cd-seg" key={u}>
          {pad(map[u], u)}
          <span className="u">{u}</span>
        </span>
      ))}
    </span>
  );
}
