import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { PopularCard } from '@/lib/conversions/popular-cards';

export function PopularPairsGrid({ cards }: { cards: PopularCard[] }) {
  return (
    <ul
      className="grid gap-2.5"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
    >
      {cards.map((card) => (
        <li key={card.slug}>
          <Link
            href={`/convert/${card.slug}`}
            className="group block rounded-lg border border-[color:var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[color:var(--border-strong)] hover:bg-[var(--hover)]"
          >
            <div className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight text-[color:var(--fg)]">
              <span className="truncate">{card.fromName}</span>
              <ArrowRight
                className="size-3.5 shrink-0 text-[color:var(--fg-subtle)]"
                aria-hidden="true"
              />
              <span className="truncate">{card.toName}</span>
            </div>
            <div className="mt-1 font-mono text-[11.5px] text-[color:var(--fg-muted)]">
              {card.fromCode} · {card.toCode} ·{' '}
              <span className="font-semibold text-[color:var(--brand)]">{card.deltaLabel}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
