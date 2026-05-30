import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import env from '@/lib/env';

interface Item {
  label: string;
  href?: string;
}

interface Props {
  items: Item[];
}

export function Breadcrumbs({ items }: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href && { item: `${env.NEXT_PUBLIC_BASE_URL}${item.href}` }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD payload built from typed inputs
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-[color:var(--fg-muted)]">
          {items.map((item, i) => (
            <li key={item.href ?? `crumb-${item.label}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
              {item.href ? (
                <Link prefetch={false} href={item.href} className="hover:text-[color:var(--fg)]">
                  {item.label}
                </Link>
              ) : (
                <span className="text-[color:var(--fg)]">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
