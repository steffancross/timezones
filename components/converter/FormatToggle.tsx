'use client';

import { useConverterStore } from '@/lib/store/converter';
import { cn } from '@/lib/utils';

/**
 * Two-button segmented control for 12/24 hour format. radiogroup ARIA pattern.
 */
export function FormatToggle() {
  const format = useConverterStore((s) => s.format);
  const setFormat = useConverterStore((s) => s.setFormat);

  // role="group" + per-button aria-pressed: standard a11y pattern for a
  // segmented button toggle. We deliberately don't use the radiogroup/radio
  // ARIA roles — those imply roving-tabindex keyboard nav (←/→ to switch),
  // which neither browsers nor users expect from a 2-state segmented control.
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> would require a visually-hidden <legend> and significant default-style overrides for a 2-button segmented toggle. role="group" + aria-label is the standard pattern for this control.
    <div
      role="group"
      aria-label="Time format"
      className="inline-flex h-8 items-center gap-0.5 rounded-[var(--radius)] border border-[color:var(--border)] bg-card p-0.5"
    >
      <SegmentButton active={format === '12'} onClick={() => setFormat('12')}>
        12
      </SegmentButton>
      <SegmentButton active={format === '24'} onClick={() => setFormat('24')}>
        24
      </SegmentButton>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-[3px] px-2.5 py-0.5 font-mono text-[12px] tracking-[0.02em] transition-colors',
        active
          ? 'bg-[color:var(--fg)] text-[color:var(--bg)]'
          : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
      )}
    >
      {children}
    </button>
  );
}
