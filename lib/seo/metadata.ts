import type { Metadata } from 'next';
import env from '@/lib/env';

interface BuildMetadataArgs {
  /** Page title — gets " | Site Name" suffix automatically via root layout template. */
  title: string;
  /** Page description, aim for 150-160 chars. */
  description: string;
  /** Path on this site (e.g. '/convert/pst-to-est'). Leading slash required. */
  path: string;
  /** OG image override; falls back to the site default. Relative or absolute. */
  ogImage?: string;
  /** If true, marks the page noindex/nofollow. */
  noindex?: boolean;
}

const DEFAULT_OG_IMAGE = '/og-default.png';

/**
 * Build a Next Metadata object with canonical URL, OG, and Twitter card tags.
 * Root layout sets `metadataBase`, so relative `images` paths would resolve
 * correctly — but the absolute URLs here are explicit so per-page output is
 * obvious when reading view-source.
 */
export function buildMetadata(args: BuildMetadataArgs): Metadata {
  const url = `${env.NEXT_PUBLIC_BASE_URL}${args.path}`;
  const ogPath = args.ogImage ?? DEFAULT_OG_IMAGE;
  const absoluteOg = ogPath.startsWith('http') ? ogPath : `${env.NEXT_PUBLIC_BASE_URL}${ogPath}`;

  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: url },
    openGraph: {
      title: args.title,
      description: args.description,
      url,
      images: [{ url: absoluteOg }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: args.title,
      description: args.description,
      images: [absoluteOg],
    },
    ...(args.noindex && { robots: { index: false, follow: false } }),
  };
}
