'use client';

import { RotateCcw } from 'lucide-react';
import { useConverterStore } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';
import { cn } from '@/lib/utils';

/**
 * Toolbar reset: returns everything user-tweakable (date, anchor, overlays,
 * working hours, format) to defaults. Leaves the zone list alone.
 *
 * The anchor pill's × handles "just clear the anchor" — this button is for
 * everything else: a changed date, weekend toggled on, working hours edited,
 * format flipped to 24h, etc.
 */
export function ResetButton() {
  const resetAll = useConverterStore((s) => s.resetAll);
  const anchorHour = useConverterStore((s) => s.anchorHour);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const defaultAnchorDate = useConverterStore((s) => s.defaultAnchorDate);
  const format = useConverterStore((s) => s.format);
  const overlay = useConverterStore((s) => s.overlay);
  const workingHours = useConverterStore((s) => s.workingHours);

  const isAnchorSet = anchorHour !== null;
  const isDateChanged = anchorDate !== defaultAnchorDate;
  const isFormatChanged = format !== '12';
  const isOverlayChanged =
    overlay.dayNight !== true || overlay.workHours !== false || overlay.weekend !== false;
  const isWorkingHoursChanged =
    workingHours.start !== DEFAULT_WORKING_HOURS.start ||
    workingHours.end !== DEFAULT_WORKING_HOURS.end ||
    workingHours.days.length !== DEFAULT_WORKING_HOURS.days.length ||
    workingHours.days.some((d, i) => d !== DEFAULT_WORKING_HOURS.days[i]);

  const disabled =
    !isAnchorSet &&
    !isDateChanged &&
    !isFormatChanged &&
    !isOverlayChanged &&
    !isWorkingHoursChanged;

  return (
    <button
      type="button"
      onClick={resetAll}
      disabled={disabled}
      aria-label="Reset settings to defaults"
      title="Reset settings to defaults"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-[var(--radius)]',
        'border border-[color:var(--border)] bg-card',
        'text-[color:var(--fg-muted)] transition-colors',
        !disabled && 'hover:bg-[var(--hover)] hover:text-[color:var(--fg)]',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <RotateCcw className="size-4" />
    </button>
  );
}
