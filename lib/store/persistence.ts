import { DEFAULT_WORKING_HOURS, type WorkingHours } from '@/lib/time/working-hours';
import type { ConverterState } from './converter';
import { useConverterStore } from './converter';

const STORAGE_KEY = 'converter_prefs';

interface PersistedPrefs {
  format: ConverterState['format'];
  overlay: ConverterState['overlay'];
  workingHours: ConverterState['workingHours'];
}

export function loadPersistedPrefs(): PersistedPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const bands: readonly string[] = ['dayNight', 'workHours', 'none'];
    return {
      format: parsed.format === '24' ? '24' : '12',
      overlay: {
        band: bands.includes(parsed.overlay?.band)
          ? (parsed.overlay.band as 'dayNight' | 'workHours' | 'none')
          : 'dayNight',
        weekend: Boolean(parsed.overlay?.weekend),
      },
      workingHours: validateWorkingHours(parsed.workingHours) ?? DEFAULT_WORKING_HOURS,
    };
  } catch {
    return null;
  }
}

function validateWorkingHours(value: unknown): WorkingHours | null {
  if (!value || typeof value !== 'object') return null;
  const wh = value as Partial<WorkingHours>;
  const start = wh.start;
  const end = wh.end;
  const days = wh.days;
  if (typeof start !== 'number' || start < 0 || start > 23) return null;
  if (typeof end !== 'number' || end < 0 || end > 24 || end <= start) return null;
  if (!Array.isArray(days)) return null;
  const validDays = days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  if (!validDays) return null;
  return { start, end, days };
}

/**
 * Subscribe the store to write prefs to localStorage on change. Returns the
 * unsubscribe function. Call once on client mount.
 */
export function attachPersistence(): (() => void) | undefined {
  if (typeof window === 'undefined') return;

  return useConverterStore.subscribe(
    (state) => ({
      format: state.format,
      overlay: state.overlay,
      workingHours: state.workingHours,
    }),
    (prefs) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      } catch {
        // Quota exceeded or storage unavailable; silently ignore.
      }
    },
    {
      equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    },
  );
}
