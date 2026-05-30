import { DateTime } from 'luxon';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { getAllArticles } from '@/lib/articles';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Articles',
  description: 'Articles about time zones, daylight saving time, and scheduling across the world.',
  path: '/articles',
});

export default async function ArticlesIndex() {
  const articles = await getAllArticles();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Articles' }]} />

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-semibold">Articles</h1>
        <p className="mt-2 text-muted-foreground">
          Time zones, daylight saving, and scheduling — explained.
        </p>
      </header>

      <ul className="space-y-4">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link
              prefetch={false}
              href={`/articles/${a.slug}`}
              className="block rounded-md border border-border p-4 hover:bg-accent"
            >
              <div className="font-semibold">{a.frontmatter.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {DateTime.fromISO(a.frontmatter.published).toFormat('MMMM d, yyyy')}
                {' · '}
                {a.frontmatter.description}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
