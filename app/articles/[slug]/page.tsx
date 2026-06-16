import { notFound } from 'next/navigation';
import { ArticleShell } from '@/components/templates/article/ArticleShell';
import { getAllArticleSlugs, getArticleFrontmatter } from '@/lib/articles';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fm = await getArticleFrontmatter(slug);
  if (!fm) return { title: 'Not found' };

  return buildMetadata({
    title: fm.title,
    description: fm.description,
    path: `/articles/${slug}`,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fm = await getArticleFrontmatter(slug);
  if (!fm) notFound();

  const { default: MDXContent } = await import(`@/content/articles/${slug}.mdx`);

  return (
    <ArticleShell frontmatter={fm} slug={slug}>
      <MDXContent />
    </ArticleShell>
  );
}
