import { formatUtcOffset } from '@/lib/zones/offset';
import { resolveZone } from '@/lib/zones/resolve';
import { parseOffsetToken } from './offset-token';
import type { RawMatch } from './parse';
import type { AmbiguousEvent, ResolvedEvent, ZoneResolution } from './types';

/**
 * Smart Converter — zone classification (pipeline step 3).
 *
 * Turns each `RawMatch` into a `ResolvedEvent` or `AmbiguousEvent` by deciding
 * its source zone. The whole "hard part" (city/region aliases, abbreviation
 * collisions) is delegated to `resolveZone` (`lib/zones/resolve.ts`) — we never
 * reimplement zone matching here.
 *
 * Rules locked with the user:
 *  - Rule 1: a match with no zone anywhere is converted against the viewer's own
 *    (target) zone, flagged `kind: 'target'` so the card can say "assumed".
 *  - Rule 3: a zoneless match INHERITS the last confidently-resolved zone from an
 *    earlier match in the same paste (the `inheritable` accumulator below).
 *  - Ambiguous abbreviations are never auto-picked — every candidate is surfaced.
 */

type ClassifyCtx = { targetIana: string };

/** What a later zoneless event can inherit — anything we resolved confidently. */
type Inheritable = Extract<ZoneResolution, { kind: 'named' | 'offset' }>;

export function classify(
  matches: RawMatch[],
  ctx: ClassifyCtx,
): Array<ResolvedEvent | AmbiguousEvent> {
  const out: Array<ResolvedEvent | AmbiguousEvent> = [];
  let inheritable: Inheritable | null = null;

  for (const m of matches) {
    const base = {
      matchIndex: m.index,
      matchText: m.text,
      zoneTokenText: m.rawZoneToken,
      zoneTokenIndex: m.zoneTokenIndex,
      start: m.start,
      end: m.end,
      hasRange: m.hasRange,
    };

    const token = m.rawZoneToken;

    // 1. Explicit numeric offset — a fixed zone, no DST.
    const offset = token ? parseOffsetToken(token) : null;
    if (offset) {
      const zone: Inheritable = {
        kind: 'offset',
        minutes: offset.minutes,
        label: formatUtcOffset(offset.minutes),
      };
      inheritable = zone;
      out.push({ ...base, status: 'resolved', zone });
      continue;
    }

    // 2. Named zone / abbreviation / city phrase via resolveZone.
    if (token) {
      const resolved = resolveZone(token);
      if (resolved?.ambiguous && resolved.ambiguous.length > 0) {
        out.push({
          ...base,
          status: 'ambiguous',
          token: token,
          candidates: [resolved.zone, ...resolved.ambiguous],
        });
        continue; // don't update inheritable — still unresolved
      }
      if (resolved) {
        const zone: Inheritable = { kind: 'named', zone: resolved.zone, iana: resolved.zone.iana };
        inheritable = zone;
        out.push({ ...base, status: 'resolved', zone });
        continue;
      }
      // token didn't resolve to a zone → fall through as if zoneless
    }

    // 3. No usable zone token: inherit (rule 3) or assume target (rule 1).
    let zone: ZoneResolution;
    if (inheritable?.kind === 'named') {
      zone = { kind: 'inherited', zone: inheritable.zone, iana: inheritable.iana };
    } else if (inheritable?.kind === 'offset') {
      zone = inheritable; // carry the offset forward
    } else {
      zone = { kind: 'target', iana: ctx.targetIana };
    }
    out.push({ ...base, status: 'resolved', zone });
  }

  return out;
}
