import { ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Converter } from '@/components/converter/Converter';
import { ConverterStateProvider } from '@/components/converter/ConverterStateProvider';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { PairContent } from '@/components/templates/PairContent';
import { buildMetadata } from '@/lib/seo/metadata';
import { getCuratedPairSlugs } from '@/lib/sitemap/pair-slugs';
import { type ParsedPair, parsePairSlug } from '@/lib/slugs/parse';
import { urlToState } from '@/lib/store/from-url';

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

export default async function PairPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const pair = parsePairSlug(slug);
  if (!pair) notFound();

  // Slug-only seed. Reading `searchParams` here would opt this route out of
  // static rendering (Next App Router rule), which would force every
  // `/convert/*` request through the Worker with `cache-control: no-store`.
  // Optional `?d`, `?r`, `?f`, `?z` overrides are applied client-side by
  // `SearchParamsHydrator` so the page can stay statically prerendered and be
  // served from OpenNext's incremental cache (no revalidation — pair pages are
  // fully static).
  const initialState = urlToState({ pair });

  const fromLabel = shortLabel(pair.from);
  const toLabel = shortLabel(pair.to);
  const reverseSlug = `${slugOf(pair.to)}-to-${slugOf(pair.from)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Conversions', href: '/conversions' },
          { label: `${fromLabel} to ${toLabel}` },
        ]}
      />

      <header className="mt-3 mb-2">
        <h1 className="text-3xl font-semibold">
          {fromLabel} to {toLabel} Converter
        </h1>
      </header>

      <Link
        prefetch={false}
        href={`/convert/${reverseSlug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--fg-muted)] transition-colors hover:text-[color:var(--fg)]"
      >
        <ArrowLeftRight className="size-3.5" aria-hidden="true" />
        Compare {toLabel} to {fromLabel} instead
      </Link>

      <ConverterStateProvider initialState={initialState}>
        <div id="converter-top" className="scroll-mt-4">
          <Converter />
        </div>

        <PairContent pair={pair} slug={slug} />
      </ConverterStateProvider>
    </div>
  );
}

function displayName(zoc: ParsedPair['from']): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

function shortLabel(zoc: ParsedPair['from']): string {
  return zoc.kind === 'zone' ? zoc.zone.id.toUpperCase() : zoc.city.name;
}

function slugOf(zoc: ParsedPair['from']): string {
  return zoc.kind === 'zone' ? zoc.zone.id : zoc.city.id;
}
