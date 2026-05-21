import { Converter } from '@/components/converter/Converter';
import { ConverterStateProvider } from '@/components/converter/ConverterStateProvider';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PairContent } from '@/components/templates/PairContent';
import { buildMetadata } from '@/lib/seo/metadata';
import { getCuratedPairSlugs } from '@/lib/sitemap/pair-slugs';
import { type ParsedPair, parsePairSlug } from '@/lib/slugs/parse';
import { parseSearchParams, urlToState } from '@/lib/store/from-url';
import { notFound } from 'next/navigation';

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return getCuratedPairSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pair = parsePairSlug(slug);
  if (!pair) return { title: 'Not found' };

  const fromName = displayName(pair.from);
  const toName = displayName(pair.to);

  return buildMetadata({
    title: `${fromName} to ${toName} Converter`,
    description: `Convert ${fromName} to ${toName}. Current time, UTC offset, DST behavior, and the full 24-hour conversion table.`,
    path: `/convert/${slug}`,
  });
}

export default async function PairPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const pair = parsePairSlug(slug);
  if (!pair) notFound();

  // `urlToState` deliberately omits `defaultAnchorDate` — the store's
  // `initialize` action derives it from the home zone (see
  // lib/store/converter.ts initialize implementation).
  const initialState = urlToState({ pair, ...parseSearchParams(sp) });

  const fromLabel = shortLabel(pair.from);
  const toLabel = shortLabel(pair.to);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: `${fromLabel} to ${toLabel}` }]}
      />

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-semibold">
          {fromLabel} to {toLabel} Converter
        </h1>
      </header>

      <ConverterStateProvider initialState={initialState}>
        <Converter />
      </ConverterStateProvider>

      <PairContent pair={pair} slug={slug} />
    </div>
  );
}

function displayName(zoc: ParsedPair['from']): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

function shortLabel(zoc: ParsedPair['from']): string {
  return zoc.kind === 'zone' ? zoc.zone.id.toUpperCase() : zoc.city.name;
}
