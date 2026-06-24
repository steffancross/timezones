import { cellInstant, viewerWeekStart } from '@/lib/rooms/compute';
import { DateTime } from '@/lib/time/luxon';

export function selectionToMillis(
  weekAnchor: string,
  viewerTz: string,
  day: number,
  startSlot: number,
  endSlot: number,
): { startMs: number; endMs: number } {
  const weekStart = viewerWeekStart(weekAnchor, viewerTz);
  const startMs = cellInstant(weekStart, day, startSlot).millis;
  // endMs is the start of the slot AFTER endSlot (event end time)
  const endMs = cellInstant(weekStart, day, endSlot).millis + 30 * 60 * 1000;
  return { startMs, endMs };
}

function toUtcCalendarString(ms: number): string {
  return DateTime.fromMillis(ms, { zone: 'UTC' }).toFormat("yyyyMMdd'T'HHmmss") + 'Z';
}

export function googleCalendarUrl(
  title: string,
  startMs: number,
  endMs: number,
  tz: string,
): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Team meeting',
    dates: `${toUtcCalendarString(startMs)}/${toUtcCalendarString(endMs)}`,
    ctz: tz,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function toLocalCalendarString(ms: number, tz: string): string {
  return DateTime.fromMillis(ms).setZone(tz).toFormat("yyyyMMdd'T'HHmmss");
}

export function buildIcs(title: string, startMs: number, endMs: number, tz: string): string {
  const summary = title || 'Team meeting';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//worldtimezones//EN',
    'BEGIN:VEVENT',
    `DTSTART;TZID=${tz}:${toLocalCalendarString(startMs, tz)}`,
    `DTEND;TZID=${tz}:${toLocalCalendarString(endMs, tz)}`,
    `SUMMARY:${summary}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
