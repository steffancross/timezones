import Link from 'next/link';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { getCityById } from '@/lib/cities/resolve';

interface Props {
  bareSlug: string;
  qualifiedSlugs: string[];
}

function capitalize(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/**
 * Renders at bare-city URLs like /time-in/cambridge when multiple cities share
 * the same colloquial name. Self-canonical (per G10) and indexable — these are
 * real entry points for ambiguous searches, not error pages.
 */
export function DisambiguationList({ bareSlug, qualifiedSlugs }: Props) {
  const cities = qualifiedSlugs
    .map((slug) => getCityById(slug))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.population - a.population);

  const displayName = capitalize(bareSlug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Cities', href: '/cities' },
          { label: displayName },
        ]}
      />

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-semibold">{displayName}</h1>
        <p className="mt-2 text-[color:var(--fg-muted)]">
          Multiple cities named {displayName}. Choose one:
        </p>
      </header>

      <ul className="space-y-2">
        {cities.map((c) => (
          <li key={c.id}>
            <Link
              prefetch={false}
              href={`/time-in/${c.id}`}
              className="block rounded-[var(--radius)] border border-[color:var(--border)] bg-card p-4 hover:bg-[var(--hover)]"
            >
              <div className="font-semibold">
                {c.name}
                {c.admin1 ? `, ${c.admin1}` : ''}
              </div>
              <div className="mt-1 text-sm text-[color:var(--fg-muted)]">
                {c.country} · {c.iana} · population {c.population.toLocaleString()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
