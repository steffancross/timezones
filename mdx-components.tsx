import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { Callout } from '@/components/site/Callout';
import { ZoneCard } from '@/components/site/ZoneCard';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    ZoneCard,
    h1: ({ children }) => <h1 className="mt-8 mb-4 text-3xl font-semibold">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-8 mb-3 text-2xl font-semibold">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-6 mb-2 text-xl font-semibold">{children}</h3>,
    p: ({ children }) => <p className="my-4 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="my-4 list-disc space-y-1 pl-6">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-1 pl-6">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    hr: () => <hr className="my-8 border-border" />,
    a: ({ href, children }) => {
      const url = href ?? '';
      // Internal = relative or same-origin root paths ('/dst', '/conversions').
      // External (http/https/mailto/etc.) opens in a new tab with safe rel.
      const isInternal = url.startsWith('/') && !url.startsWith('//');

      if (isInternal) {
        return (
          <Link href={url} className="underline underline-offset-2 hover:text-[color:var(--fg)]">
            {children}
          </Link>
        );
      }

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[color:var(--fg)]"
        >
          {children}
        </a>
      );
    },
    code: ({ children }) => (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="my-4 overflow-x-auto rounded-md bg-muted p-4 text-sm">{children}</pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-border pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
  };
}
