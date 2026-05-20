'use client';

import { useConverterStore } from '@/lib/store/converter';

/**
 * Date pill: a styled wrapper around the native `<input type="date">`. Uses
 * the browser's built-in date UI (no JS library) and matches the design's
 * pill geometry.
 */
export function DatePicker() {
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const setAnchorDate = useConverterStore((s) => s.setAnchorDate);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) setAnchorDate(value);
  }

  return (
    <label
      className="
        inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)]
        border border-[color:var(--border)] bg-card
        px-2.5 text-[13px] font-mono tabular-nums
        focus-within:border-[color:var(--brand)]
        focus-within:shadow-[0_0_0_3px_var(--brand-soft)]
      "
    >
      <input
        type="date"
        value={anchorDate}
        onChange={handleChange}
        className="w-[120px] bg-transparent text-[color:var(--fg)] outline-none [color-scheme:light_dark]"
        aria-label="Anchor date"
      />
    </label>
  );
}
