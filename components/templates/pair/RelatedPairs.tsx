import Link from 'next/link';
import { getRelatedPairs } from '@/lib/linking/related-pairs';

interface Props {
  slug: string;
}

export function RelatedPairs({ slug }: Props) {
  const related = getRelatedPairs(slug);
  if (related.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Related conversions</h2>
      <ul className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 md:grid-cols-3">
        {related.map((r) => (
          <li key={r.slug}>
            <Link
              prefetch={false}
              href={`/convert/${r.slug}`}
              className="block rounded-[var(--radius)] border border-[color:var(--border)] px-3 py-2 hover:bg-[var(--hover)]"
            >
              {r.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
