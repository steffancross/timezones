import type { ParsedPair } from '@/lib/slugs/parse';
import { DSTNotes } from './DSTNotes';
import { OffsetSummary } from './OffsetSummary';
import { PairAirports } from './PairAirports';
import { PairCities } from './PairCities';
import { PairDaylight } from './PairDaylight';
import { PairZoneFacts } from './PairZoneFacts';
import { QuickReferenceTable } from './QuickReferenceTable';
import { RelatedPairs } from './RelatedPairs';
import { WhenToSchedule } from './WhenToSchedule';

interface Props {
  pair: ParsedPair;
  slug: string;
}

/**
 * Server-side rendered body content for a pair page. Pure SEO/reference
 * content — no client interactivity. The live converter above this section
 * handles all interactive time math.
 */
export function PairContent({ pair, slug }: Props) {
  return (
    <article className="mt-10 space-y-12">
      <OffsetSummary pair={pair} />
      <WhenToSchedule pair={pair} />
      <PairZoneFacts pair={pair} />
      <QuickReferenceTable pair={pair} />
      <DSTNotes pair={pair} />
      <PairDaylight pair={pair} />
      <PairCities pair={pair} />
      <PairAirports pair={pair} />
      <RelatedPairs slug={slug} />
    </article>
  );
}
