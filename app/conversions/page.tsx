import Link from 'next/link';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { buildMetadata } from '@/lib/seo/metadata';
import { getPopularPairs, type PopularPair } from '@/lib/sitemap/pair-slugs';

export const metadata = buildMetadata({
  title: 'Time zone conversions',
  description:
    'Popular time zone conversion pages. Convert between PST, EST, GMT, JST, and major cities worldwide.',
  path: '/conversions',
});

function groupBySource(pairs: PopularPair[]): Record<string, PopularPair[]> {
  const groups: Record<string, PopularPair[]> = {};
  for (const p of pairs) {
    const sourceName = p.label.split(' to ')[0] ?? p.from;
    if (!groups[sourceName]) groups[sourceName] = [];
    groups[sourceName].push(p);
  }
  return groups;
}

export default function ConversionsIndex() {
  const popular = getPopularPairs(150);
  const groups = groupBySource(popular);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Conversions' }]} />

      <header className="mt-3 mb-8">
        <h1 className="text-3xl font-semibold">Time zone conversions</h1>
        <p className="mt-2 text-muted-foreground">
          Popular conversion pairs. Click any to see live conversion, DST behavior, and a 24-hour
          reference table.
        </p>
      </header>

      {Object.entries(groups).map(([source, pairs]) => (
        <section key={source} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">From {source}</h2>
          <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 md:grid-cols-4">
            {pairs.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/convert/${p.slug}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  → {p.label.split(' to ')[1] ?? p.to}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
