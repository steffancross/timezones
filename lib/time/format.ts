import type { DateTime } from 'luxon';

export type TimeFormat = '12' | '24';

/**
 * Format a wall-clock hour/minute to a time string in the given format, with
 * no Luxon dependency. 12: '3:00 pm' / 24: '15:00'. Single source of truth for
 * `formatTime`, and lets hot loops format from integer offset arithmetic
 * instead of constructing a DateTime per cell.
 */
export function formatClock(hour: number, minute: number, format: TimeFormat): string {
  const mm = String(minute).padStart(2, '0');
  if (format === '24') return `${String(hour).padStart(2, '0')}:${mm}`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${mm} ${hour < 12 ? 'am' : 'pm'}`;
}

/**
 * Format a DateTime to a time string in the given format.
 * 12: '3:00 pm' / 24: '15:00'
 */
export function formatTime(dt: DateTime, format: TimeFormat): string {
  return formatClock(dt.hour, dt.minute, format);
}

/**
 * Format an hour (0-23) to its display form in the given format.
 * 12: '3p' / 24: '15' — compact form for tile display
 */
export function formatHourTile(hour: number, format: TimeFormat): string {
  if (format === '24') return String(hour).padStart(2, '0');
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

/**
 * Format a duration in minutes to a compact label.
 * 60 → '1h'  135 → '2h 15m'  45 → '45m'  1440 → '24h'
 */
export function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format a date in human-readable form. e.g., 'Wed, May 14'
 */
export function formatDate(dt: DateTime): string {
  return dt.toFormat('ccc, MMM d');
}

/**
 * Format a UTC offset in minutes to a display string.
 * 0 → 'UTC'  60 → 'UTC+1'  -480 → 'UTC-8'  330 → 'UTC+5:30'
 */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'UTC';
  const sign = minutes > 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Format the day delta indicator for a zone tile.
 * 0 → ''  +1 → '+1 day'  -1 → '-1 day'
 */
export function formatDayDelta(delta: number): string {
  if (delta === 0) return '';
  if (delta === 1) return '+1 day';
  if (delta === -1) return '-1 day';
  return delta > 0 ? `+${delta} days` : `${delta} days`;
}
