'use client';

import { Calendar, Copy, Link2, Mail, X } from 'lucide-react';
import { DateTime } from 'luxon';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useConverterStore } from '@/lib/store/converter';
import { stateToQueryString } from '@/lib/store/to-url';
import { formatDate, formatTime } from '@/lib/time/format';

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
  const rangeStart = useConverterStore((s) => s.rangeStart);
  const rangeEnd = useConverterStore((s) => s.rangeEnd);
  const anchorDate = useConverterStore((s) => s.anchorDate);
  const defaultAnchorDate = useConverterStore((s) => s.defaultAnchorDate);
  const format = useConverterStore((s) => s.format);
  const clearRange = useConverterStore((s) => s.clearRange);

  const homeIana = zones[0]?.iana;
  if (rangeStart === null || !homeIana) return null;

  const end = rangeEnd ?? rangeStart;
  // The range is column-inclusive: [rangeStart..rangeEnd] covers the time
  // from rangeStart:00 to (rangeEnd + 1):00 in the home zone.
  const homeStart = DateTime.fromISO(anchorDate, { zone: homeIana }).set({ hour: rangeStart });
  const homeEnd = DateTime.fromISO(anchorDate, { zone: homeIana }).set({ hour: end + 1 });

  const timeLabel = `${formatTime(homeStart, format)} – ${formatTime(homeEnd, format)}`;
  const abbreviation = homeStart.toFormat('ZZZZ');
  const dateLabel = formatDate(homeStart);
  const durationLabel = `${end - rangeStart + 1}h`;

  const buildTimesText = (): string =>
    zones
      .map((zone) => {
        const s = homeStart.setZone(zone.iana);
        const e = homeEnd.setZone(zone.iana);
        return `${formatTime(s, format)} – ${formatTime(e, format)} ${s.toFormat('ZZZZ')} (${formatDate(s)})`;
      })
      .join('\n');

  const handleCopyLink = async () => {
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
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2.5">
        <span className="font-mono text-[13.5px] font-semibold tracking-[-0.005em] text-[color:var(--fg)]">
          {timeLabel}
        </span>
        <span className="font-mono text-[11.5px] text-[color:var(--fg-muted)]">
          {abbreviation} · {dateLabel}
        </span>
        <span className="rounded-full border border-[color:color-mix(in_oklab,var(--brand)_30%,transparent)] bg-[var(--brand-soft)] px-1.5 py-px font-mono text-[11px] font-semibold text-[color:var(--brand)]">
          {durationLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
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
