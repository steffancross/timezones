'use client';

import { useConverterStore } from '@/components/converter/store-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MINUTES_PER_DAY, RANGE_STEP_MIN } from '@/lib/converter/range';
import { stateToQueryString } from '@/lib/store/to-url';
import {
  formatClock,
  formatDate,
  formatDuration,
  formatTime,
  type TimeFormat,
} from '@/lib/time/format';
import { currentAbbreviation } from '@/lib/zones/abbreviation';
import { Calendar, Copy, Link2, Mail, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { type ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Action bar that appears below the zones card whenever a range is selected.
 * Mounted below (not between toolbar and zones) on purpose: appearing inline
 * would shift the strip down every time the user picks a range, which is
 * visually jarring during the same gesture that creates the selection.
 *
 * Shows a brief summary (home-zone range + duration chip) and four quick
 * actions: copy link, copy times, email, calendar. The × on the right is a
 * third dismiss target alongside the RangePill's × (mobile only) and the
 * toolbar Reset button.
 *
 * Mobile: action buttons collapse to icon-only (text moves to sr-only +
 * aria-label/title) so the bar fits a narrow viewport.
 *
 * "Copy times" / "Email" / "Calendar" all use the same multi-zone formatted
 * body — one line per zone in the converter, so the recipient sees the same
 * span projected into their own zones too.
 */
export function RangeActionBar() {
  const zones = useConverterStore((s) => s.zones);
  const rangeStartMin = useConverterStore((s) => s.rangeStartMin);
  const rangeEndMin = useConverterStore((s) => s.rangeEndMin);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const defaultAnchorDate = useConverterStore((s) => s.defaultAnchorDate);
  const format = useConverterStore((s) => s.format);
  const setRangeMinutes = useConverterStore((s) => s.setRangeMinutes);
  const clearRange = useConverterStore((s) => s.clearRange);

  const homeIana = zones[0]?.iana;
  if (rangeStartMin === null || rangeEndMin === null || !homeIana) return null;

  // Half-open minute interval. `.startOf('day').plus({minutes})` is DST-safe and
  // rolls a 1440 end into next-day 00:00 correctly (unlike `.set({hour})`).
  const homeStart = DateTime.fromISO(anchorDate, { zone: homeIana })
    .startOf('day')
    .plus({ minutes: rangeStartMin });
  const homeEnd = DateTime.fromISO(anchorDate, { zone: homeIana })
    .startOf('day')
    .plus({ minutes: rangeEndMin });

  const abbreviation = currentAbbreviation(homeIana, homeStart);
  const dateLabel = formatDate(homeStart);
  const durationLabel = formatDuration(rangeEndMin - rangeStartMin);

  const buildTimesText = (): string =>
    zones
      .map((zone) => {
        const s = homeStart.setZone(zone.iana);
        const e = homeEnd.setZone(zone.iana);
        return `${formatTime(s, format)} – ${formatTime(e, format)} ${currentAbbreviation(zone.iana, s)} (${formatDate(s)})`;
      })
      .join('\n');

  const handleCopyLink = async () => {
    const qs = stateToQueryString({
      zones,
      anchorDate,
      defaultAnchorDate,
      rangeStartMin,
      rangeEndMin,
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

  const handleCopyTimes = async () => {
    try {
      await navigator.clipboard.writeText(buildTimesText());
      toast.success('Times copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Meeting time');
    const body = encodeURIComponent(buildTimesText());
    // mailto: with no recipient — opens the user's default mail client with
    // the To: field empty for them to fill in. window.location avoids opening
    // a blank tab in browsers that resolve mailto: via webmail handlers.
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCalendar = () => {
    // Google Calendar event-create URL. `dates` is `START/END` in UTC,
    // formatted as `YYYYMMDDTHHmmssZ` per the documented compact form.
    const startUtc = homeStart.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
    const endUtc = homeEnd.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
    const text = encodeURIComponent('Meeting');
    const details = encodeURIComponent(buildTimesText());
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${startUtc}/${endUtc}&details=${details}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-[color:color-mix(in_oklab,var(--brand)_30%,transparent)] bg-card px-3 py-2.5 shadow-[0_1px_0_oklch(0_0_0/0.02),0_8px_24px_-20px_oklch(0_0_0/0.10)]">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <RangeTimeSelect
            kind="start"
            value={rangeStartMin}
            otherValue={rangeEndMin}
            format={format}
            onChange={(startMin) => setRangeMinutes({ startMin })}
          />
          <span aria-hidden="true" className="font-mono text-[13px] text-[color:var(--fg-muted)]">
            –
          </span>
          <RangeTimeSelect
            kind="end"
            value={rangeEndMin}
            otherValue={rangeStartMin}
            format={format}
            onChange={(endMin) => setRangeMinutes({ endMin })}
          />
        </div>
        <span className="font-mono text-[11.5px] text-[color:var(--fg-muted)]">
          {abbreviation} · {dateLabel}
        </span>
        <span className="rounded-full border border-[color:color-mix(in_oklab,var(--brand)_30%,transparent)] bg-[var(--brand-soft)] px-1.5 py-px font-mono text-[11px] font-semibold text-[color:var(--brand)]">
          {durationLabel}
        </span>
      </div>
      {/* On mobile the selects are wider than the old text label, so the button
          row goes full-width below the summary (order-last) instead of letting
          the selects overflow under it. The dismiss × keeps order-0, so it stays
          on the top row with the selects rather than stranded on its own line. */}
      <div className="flex flex-wrap gap-1.5 max-md:order-last max-md:w-full max-md:justify-end">
        <ActionBtn
          icon={<Link2 className="size-3.5" />}
          label="Copy link"
          onClick={handleCopyLink}
        />
        <ActionBtn
          icon={<Copy className="size-3.5" />}
          label="Copy times"
          onClick={handleCopyTimes}
        />
        <ActionBtn icon={<Mail className="size-3.5" />} label="Email" onClick={handleEmail} />
        <ActionBtn
          icon={<Calendar className="size-3.5" />}
          label="Calendar"
          onClick={handleCalendar}
        />
      </div>
      <button
        type="button"
        onClick={clearRange}
        aria-label="Dismiss range"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[color:var(--fg-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[color:var(--fg)]"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * A 15-minute-granularity time picker for one endpoint of the range. Radix
 * Select (via the shadcn primitive) so the option list is height-bounded and
 * scrollable rather than a full-screen native popup — it also auto-scrolls to
 * the selected time on open and supports type-ahead. Start lists 00:00–23:45;
 * end lists 00:15–24:00 (the 24:00 = next-day midnight option is tagged +1d).
 * Options that would invert the range are disabled; the store clamp is the
 * backstop.
 */
function RangeTimeSelect({
  kind,
  value,
  otherValue,
  format,
  onChange,
}: {
  kind: 'start' | 'end';
  value: number;
  otherValue: number;
  format: TimeFormat;
  onChange: (min: number) => void;
}) {
  const lo = kind === 'start' ? 0 : RANGE_STEP_MIN;
  const hi = kind === 'start' ? MINUTES_PER_DAY - RANGE_STEP_MIN : MINUTES_PER_DAY;
  const options: number[] = [];
  for (let m = lo; m <= hi; m += RANGE_STEP_MIN) options.push(m);

  const selectedItemRef = useRef<HTMLDivElement>(null);

  // popper only scrolls the selected item just into view (it lands at the bottom
  // edge). On open, recenter it within the viewport — scroll the Radix viewport
  // directly rather than scrollIntoView, which can also jog the page. rAF lets
  // Radix's own open-scroll settle first.
  const centerSelected = useCallback(() => {
    requestAnimationFrame(() => {
      const item = selectedItemRef.current;
      const viewport = item?.closest<HTMLElement>('[data-radix-select-viewport]');
      if (!item || !viewport) return;
      const itemRect = item.getBoundingClientRect();
      const vpRect = viewport.getBoundingClientRect();
      viewport.scrollTop += itemRect.top - vpRect.top - (vpRect.height - itemRect.height) / 2;
    });
  }, []);

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      onOpenChange={(isOpen) => {
        if (isOpen) centerSelected();
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={kind === 'start' ? 'Range start time' : 'Range end time'}
        className="gap-1 border-[color:var(--border)] bg-[var(--input-bg)] pr-1.5 pl-2 font-mono text-[13px] font-semibold tracking-[-0.005em] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]"
      >
        <SelectValue />
      </SelectTrigger>
      {/* position=popper makes this a bounded, scrolling popover; item-aligned
          (the default) grows to fit all 96 items and ignores the height cap. */}
      <SelectContent position="popper" className="max-h-72">
        {options.map((m) => (
          <SelectItem
            key={m}
            ref={m === value ? selectedItemRef : null}
            value={String(m)}
            disabled={kind === 'start' ? m >= otherValue : m <= otherValue}
            className="font-mono text-[13px]"
          >
            {clockLabel(m, format)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Option label for a minute-of-day. 1440 = next-day midnight, tagged +1d. */
function clockLabel(min: number, format: TimeFormat): string {
  if (min >= MINUTES_PER_DAY) {
    return `${format === '24' ? '24:00' : '12:00 am'} +1d`;
  }
  return formatClock(Math.floor(min / 60), min % 60, format);
}

/**
 * Action button. On mobile the text label is visually hidden (icon-only) but
 * still announced to screen readers via aria-label and shown as a native
 * tooltip via title.
 */
function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[color:var(--border)] bg-card px-2.5 max-md:size-8 max-md:justify-center max-md:gap-0 max-md:px-0 text-[12.5px] text-[color:var(--fg)] transition-colors hover:bg-[var(--hover)]"
    >
      <span className="text-[color:var(--fg-muted)]">{icon}</span>
      <span className="max-md:sr-only">{label}</span>
    </button>
  );
}
