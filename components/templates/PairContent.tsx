import type { ParsedPair } from '@/lib/slugs/parse';
import { DSTNotes } from './DSTNotes';
import { OffsetSummary } from './OffsetSummary';
import { PairAirports } from './PairAirports';
import { PairCities } from './PairCities';
import { PairDaylight } from './PairDaylight';
import { PairZoneFacts } from './PairZoneFacts';
import { QuickReferenceTable } from './QuickReferenceTable';
import { WhenToSchedule } from './WhenToSchedule';

interface Props {
  pair: ParsedPair;
  /** Slug is passed through for I1's RelatedPairs (added later). */
  slug: string;
}

/**
 * Server-side rendered body content for a pair page. Pure SEO/reference
 * content — no client interactivity. The live converter above this section
 * handles all interactive time math.
 *
 * The FAQ section was intentionally removed in favor of richer data-derived
 * sections (cities + airports). The original FAQ items were padded — the city
 * lists are stronger content AND each link feeds traffic to PR-3 city pages.
 */
export function PairContent({ pair, slug: _slug }: Props) {
  return (
    <article className="mt-10 space-y-12">
      <OffsetSummary pair={pair} />
      <PairZoneFacts pair={pair} />
      <QuickReferenceTable pair={pair} />
      <WhenToSchedule pair={pair} />
      <DSTNotes pair={pair} />
      <PairDaylight pair={pair} />
      <PairCities pair={pair} />
      <PairAirports pair={pair} />
      {/* RelatedPairs (I1) slots in here once curated link blocks are built. */}
    </article>
  );
}
