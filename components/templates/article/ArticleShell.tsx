import { DateTime } from 'luxon';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import type { ArticleFrontmatter } from '@/lib/articles';
import env from '@/lib/env';

interface Props {
  frontmatter: ArticleFrontmatter;
  slug: string;
  children: ReactNode;
}

export function ArticleShell({ frontmatter, slug, children }: Props) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.published,
    dateModified: frontmatter.updated ?? frontmatter.published,
    author: { '@type': 'Organization', name: 'Time Zone Converter' },
    publisher: { '@type': 'Organization', name: 'Time Zone Converter' },
    mainEntityOfPage: `${env.NEXT_PUBLIC_BASE_URL}/articles/${slug}`,
  };

  const publishedLabel = DateTime.fromISO(frontmatter.published).toFormat('MMMM d, yyyy');
  const updatedLabel =
    frontmatter.updated && frontmatter.updated !== frontmatter.published
      ? DateTime.fromISO(frontmatter.updated).toFormat('MMMM d, yyyy')
      : null;

  return (
    <article className="mx-auto max-w-2xl px-4 py-6">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload built from typed inputs
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Articles', href: '/articles' },
          { label: frontmatter.title },
        ]}
      />

      <header className="mt-3 mb-6 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold">{frontmatter.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {publishedLabel}
          {updatedLabel && ` · Updated ${updatedLabel}`}
        </p>
      </header>

      <div className="prose-content">{children}</div>
    </article>
  );
}
