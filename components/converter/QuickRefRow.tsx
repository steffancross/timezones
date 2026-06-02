'use client';

import { useConverterStoreApi } from '@/components/converter/store-context';

interface Props {
  /** Home-zone hour (0-23) this row represents — the column to select. */
  hour: number;
  fromText: string;
  toText: string;
  dayText: string;
  /** Spoken label, e.g. "Show 9:00 am EST in the converter". */
  ariaLabel: string;
}

/**
 * A Quick-reference table row that, on click/Enter/Space, selects its hour in
 * the live converter above and scrolls up to it. Thin client wrapper so the
 * surrounding table stays a Server Component (its text is the SEO surface);
 * only the interaction is client-side. Reaches the per-mount converter store
 * via context — which is why `ConverterStateProvider` wraps `PairContent`.
 */
export function QuickRefRow({ hour, fromText, toText, dayText, ariaLabel }: Props) {
  const store = useConverterStoreApi();

  function select() {
    store.getState().setRange(hour, hour);
    document.getElementById('converter-top')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: whatever
    <tr
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      }}
      className="cursor-pointer border-t border-[color:var(--border)] tabular-nums transition-colors hover:bg-[color:var(--hover)] focus-visible:bg-[color:var(--hover)] focus-visible:outline-none"
    >
      <td className="px-4 py-1.5">{fromText}</td>
      <td className="px-4 py-1.5">{toText}</td>
      <td className="px-4 py-1.5 text-[color:var(--fg-muted)]">{dayText}</td>
    </tr>
  );
}
