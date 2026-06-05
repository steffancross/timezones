'use client';

import { RotateCcw } from 'lucide-react';
import { useConverterStore } from '@/components/converter/store-context';
import { DEFAULT_OVERLAY } from '@/lib/store/converter';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';
import { cn } from '@/lib/utils';

/**
 * Toolbar reset: returns everything user-tweakable (date, range, overlays,
 * working hours, format) to defaults. Leaves the zone list alone.
 *
 * The range pill's × handles "just clear the range" — this button is for
 * everything else: a changed date, weekend toggled on, working hours edited,
 * format flipped to 24h, etc.
 */
export function ResetButton() {
  const resetAll = useConverterStore((s) => s.resetAll);
  const rangeStartMin = useConverterStore((s) => s.rangeStartMin);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const defaultAnchorDate = useConverterStore((s) => s.defaultAnchorDate);
  const format = useConverterStore((s) => s.format);
  const overlay = useConverterStore((s) => s.overlay);
  const workingHours = useConverterStore((s) => s.workingHours);

  const isRangeSet = rangeStartMin !== null;
  const isDateChanged = anchorDate !== defaultAnchorDate;
  const isFormatChanged = format !== '12';
  const isOverlayChanged =
    overlay.dayNight !== DEFAULT_OVERLAY.dayNight ||
    overlay.workHours !== DEFAULT_OVERLAY.workHours ||
    overlay.weekend !== DEFAULT_OVERLAY.weekend;
  const isWorkingHoursChanged =
    workingHours.start !== DEFAULT_WORKING_HOURS.start ||
    workingHours.end !== DEFAULT_WORKING_HOURS.end ||
    workingHours.days.length !== DEFAULT_WORKING_HOURS.days.length ||
    workingHours.days.some((d, i) => d !== DEFAULT_WORKING_HOURS.days[i]);

  const disabled =
    !isRangeSet &&
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
