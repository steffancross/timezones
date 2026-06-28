'use client';

import { ArrowRight, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { CuratedSelections, Selection } from '@/lib/conversions/selection';
import { cn } from '@/lib/utils';
import { PairSelector } from './PairSelector';

interface Props {
  initialFrom: Selection;
  initialTo: Selection;
  curated: CuratedSelections;
}

export function PairBuilder({ initialFrom, initialTo, curated }: Props) {
  const [from, setFrom] = useState<Selection>(initialFrom);
  const [to, setTo] = useState<Selection>(initialTo);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const href = `/convert/${from.id}-to-${to.id}`;

  return (
    <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:gap-2">
      <PairSelector label="FROM" value={from} onChange={setFrom} curated={curated} />

      <button
        type="button"
        onClick={swap}
        aria-label="Swap from and to"
        className={cn(
          'group order-2 mx-auto flex size-9 items-center justify-center self-center',
          'rounded-full border border-border bg-card text-[color:var(--fg-muted)]',
          'transition-all hover:bg-[var(--hover)] hover:text-[color:var(--fg)]',
          'md:order-none',
        )}
      >
        <ArrowRightLeft className="size-4 transition-transform duration-200 group-hover:rotate-180" />
      </button>

      <PairSelector label="TO" value={to} onChange={setTo} curated={curated} />

      <Link
        prefetch={false}
        href={href}
        className={cn(
          'order-4 inline-flex h-[68px] items-center justify-center gap-2 self-stretch',
          'rounded-lg bg-[var(--brand)] px-5 text-[14px] font-semibold text-[color:var(--brand-fg)]',
          'transition-colors hover:bg-[var(--brand-hover)]',
          'md:order-none',
        )}
      >
        Convert
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
