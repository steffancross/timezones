import { BrowseMatrix } from '@/components/conversions/BrowseMatrix';
import { PairBuilder } from '@/components/conversions/PairBuilder';
import { PopularPairsGrid } from '@/components/conversions/PopularPairsGrid';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { getMatrixSources } from '@/lib/conversions/matrix-data';
import { getPopularCards } from '@/lib/conversions/popular-cards';
import {
  DEFAULT_FROM_ID,
  DEFAULT_TO_ID,
  getCuratedSelections,
  selectionFromId,
} from '@/lib/conversions/selection';
import { buildMetadata } from '@/lib/seo/metadata';
import { Suspense } from 'react';

export const metadata = buildMetadata({
  title: 'Time zone conversions',
  description:
    'Build any time zone pair, browse popular conversions, or filter the full matrix. Convert between PST, EST, GMT, JST, and major cities worldwide.',
  path: '/conversions',
});

export default function ConversionsIndex() {
  const curated = getCuratedSelections();
  const initialFrom = selectionFromId(DEFAULT_FROM_ID);
  const initialTo = selectionFromId(DEFAULT_TO_ID);
  const cards = getPopularCards();
  const sources = getMatrixSources();

  if (!initialFrom || !initialTo) {
    throw new Error(
      `Default conversion ids did not resolve: ${DEFAULT_FROM_ID} / ${DEFAULT_TO_ID}`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 md:px-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Conversions' }]} />

      <header className="mt-3 mb-12 max-w-[640px]">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] text-[color:var(--fg)]">
          Time zone conversions
        </h1>
        <p className="mt-2 text-[15px] text-[color:var(--fg-muted)]">
          Pick any two zones or cities and jump straight to a live converter. Below, browse the most
          popular pairs at a glance — or filter the full matrix.
        </p>
      </header>

      <section className="mb-16" aria-labelledby="builder-heading">
        <h2
          id="builder-heading"
          className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-muted)]"
        >
          Build a pair
        </h2>
        <PairBuilder initialFrom={initialFrom} initialTo={initialTo} curated={curated} />
      </section>

      <section className="mb-16" aria-labelledby="popular-heading">
        <h2
          id="popular-heading"
          className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-muted)]"
        >
          Popular pairs
        </h2>
        <PopularPairsGrid cards={cards} />
      </section>

      <section aria-labelledby="browse-heading">
        <h2
          id="browse-heading"
          className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--fg-muted)]"
        >
          Browse all
        </h2>
        <Suspense fallback={null}>
          <BrowseMatrix sources={sources} initialSelectedId={initialFrom.id} />
        </Suspense>
      </section>
    </div>
  );
}
