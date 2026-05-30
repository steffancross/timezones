import { DateTime } from 'luxon';
import { currentAbbreviation } from '@/lib/zones/abbreviation';

export interface DSTTransition {
  /** The instant the transition occurs */
  date: DateTime;
  /** 'forward' = spring forward (offset increases); 'back' = fall back */
  direction: 'forward' | 'back';
  /** Offset in minutes before the transition */
  offsetBefore: number;
  /** Offset in minutes after */
  offsetAfter: number;
  /** Abbreviation before (e.g., 'PST') */
  abbreviationBefore: string;
  /** Abbreviation after (e.g., 'PDT') */
  abbreviationAfter: string;
}

/**
 * Cache of all transitions per (iana, year). Populated on first read by walking
 * the entire calendar year — Northern hemisphere zones typically have 2 entries,
 * non-DST zones have 0.
 */
const transitionCache = new Map<string, DSTTransition[]>();

/**
 * Find the next DST transition for a zone, starting from `from`.
 * Returns null if no transition occurs in the current or following year
 * (i.e., the zone doesn't observe DST).
 */
export function getNextTransition(
  iana: string,
  from: DateTime = DateTime.now(),
): DSTTransition | null {
  const fromInZone = from.setZone(iana);
  const year = fromInZone.year;

  const thisYear = getCachedYear(iana, year);
  const next = thisYear.find((t) => t.date > from);
  if (next) return next;

  const nextYear = getCachedYear(iana, year + 1);
  return nextYear[0] ?? null;
}

function getCachedYear(iana: string, year: number): DSTTransition[] {
  const cacheKey = `${iana}:${year}`;
  let cached = transitionCache.get(cacheKey);
  if (cached === undefined) {
    cached = computeTransitionsForYear(iana, year);
    transitionCache.set(cacheKey, cached);
  }
  return cached;
}

/**
 * Walk the calendar year for `iana` in 7-day chunks and collect every offset
 * change as a DSTTransition, binary-searched to the nearest second.
 */
function computeTransitionsForYear(iana: string, year: number): DSTTransition[] {
  const transitions: DSTTransition[] = [];
  const start = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: iana });
  const end = start.plus({ years: 1 });

  let lastDate = start;
  let lastOffset = start.offset;

  for (let week = 1; week <= 53; week++) {
    const candidate = start.plus({ weeks: week }).setZone(iana);
    if (candidate >= end) break;
    const offset = candidate.offset;

    if (offset !== lastOffset) {
      const exact = binarySearchTransition(iana, lastDate, candidate);
      transitions.push(buildTransition(iana, exact, lastOffset, offset));
    }

    lastDate = candidate;
    lastOffset = offset;
  }

  return transitions;
}

/**
 * Binary search to find the exact instant of an offset change.
 * Resolves to the nearest second.
 */
function binarySearchTransition(iana: string, start: DateTime, end: DateTime): DateTime {
  let low = start;
  let high = end;
  const startOffset = low.setZone(iana).offset;

  while (high.diff(low, 'seconds').seconds > 1) {
    const midMs = (low.toMillis() + high.toMillis()) / 2;
    const mid = DateTime.fromMillis(midMs);
    const offset = mid.setZone(iana).offset;
    if (offset === startOffset) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high.setZone(iana);
}

function buildTransition(
  iana: string,
  date: DateTime,
  offsetBefore: number,
  offsetAfter: number,
): DSTTransition {
  const before = date.minus({ minutes: 1 }).setZone(iana);
  const after = date.setZone(iana);
  return {
    date: after,
    direction: offsetAfter > offsetBefore ? 'forward' : 'back',
    offsetBefore,
    offsetAfter,
    // DST-aware curated abbreviation (BST/NZDT) rather than the runtime's
    // generic "GMT±N"; evaluated at each side of the transition instant.
    abbreviationBefore: currentAbbreviation(iana, before),
    abbreviationAfter: currentAbbreviation(iana, after),
  };
}

/**
 * Whether a transition is "upcoming" — within N days from now.
 */
export function isTransitionUpcoming(
  transition: DSTTransition,
  withinDays: number = 14,
  now: DateTime = DateTime.now(),
): boolean {
  const days = transition.date.diff(now, 'days').days;
  return days >= 0 && days <= withinDays;
}

/**
 * Get all transitions for a zone in a given year. Northern-hemisphere zones
 * typically have 2; non-DST zones return an empty array.
 */
export function getTransitionsForYear(iana: string, year: number): DSTTransition[] {
  return [...getCachedYear(iana, year)];
}
