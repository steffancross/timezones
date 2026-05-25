'use client';

import { useConverterStore } from '@/lib/store/converter';
import { stateToQueryString } from '@/lib/store/to-url';
import { cn } from '@/lib/utils';
import { Share } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Copies a link to the current converter view (zones + time state) to the
 * clipboard. Always emits `z=<slug>,...` so the recipient sees the same zones
 * regardless of which page the link was shared from — `z=` overrides any
 * pair/path-derived zones on hydration.
 */
export function ShareButton() {
  const zones = useConverterStore((s) => s.zones);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const defaultAnchorDate = useConverterStore((s) => s.defaultAnchorDate);
  const rangeStart = useConverterStore((s) => s.rangeStart);
  const rangeEnd = useConverterStore((s) => s.rangeEnd);
  const format = useConverterStore((s) => s.format);

  const disabled = zones.length === 0;

  const handleClick = async () => {
    const qs = stateToQueryString({
      zones,
      anchorDate,
      defaultAnchorDate,
      rangeStart,
      rangeEnd,
      format,
      includeZones: true,
    });
    const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label="Copy link to this view"
      title="Copy link to this view"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-[var(--radius)]',
        'border border-[color:var(--border)] bg-card',
        'text-[color:var(--fg-muted)] transition-colors',
        !disabled && 'hover:bg-[var(--hover)] hover:text-[color:var(--fg)]',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <Share className="size-4" />
    </button>
  );
}
