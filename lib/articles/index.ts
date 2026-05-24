import matter from 'gray-matter';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ARTICLES_DIR = join(process.cwd(), 'content', 'articles');

export interface ArticleFrontmatter {
  title: string;
  description: string;
  published: string;
  order?: number;
  updated?: string;
  related?: string[];
}

export interface ArticleListing {
  slug: string;
  frontmatter: ArticleFrontmatter;
}

export async function getAllArticleSlugs(): Promise<string[]> {
  try {
    const files = await readdir(ARTICLES_DIR);
    return files.filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''));
  } catch {
    return [];
  }
}

export async function getArticleFrontmatter(slug: string): Promise<ArticleFrontmatter | null> {
  try {
    const path = join(ARTICLES_DIR, `${slug}.mdx`);
    const raw = await readFile(path, 'utf-8');
    const { data } = matter(raw);
    return data as ArticleFrontmatter;
  } catch {
    return null;
  }
}

export async function getAllArticles(): Promise<ArticleListing[]> {
  const slugs = await getAllArticleSlugs();
  const articles = await Promise.all(
    slugs.map(async (slug) => {
      const frontmatter = await getArticleFrontmatter(slug);
      return frontmatter ? { slug, frontmatter } : null;
    }),
  );
  return articles
    .filter((a): a is ArticleListing => a !== null)
    .sort(
      (a, b) =>
        (a.frontmatter.order ?? Number.POSITIVE_INFINITY) -
        (b.frontmatter.order ?? Number.POSITIVE_INFINITY),
    );
}
