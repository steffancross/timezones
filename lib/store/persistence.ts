import { DEFAULT_WORKING_HOURS, type WorkingHours } from '@/lib/time/working-hours';
import type { ConverterState } from './converter';
import { useConverterStore } from './converter';

const STORAGE_KEY = 'converter_prefs';

/**
 * `format` (12/24) is intentionally NOT persisted. Pages default to 12, and
 * users opt into 24 via the URL `?f=24` param or the per-page toggle. The
 * toggle change still rewrites the URL via UrlSync, so the choice survives
 * reloads on the same page but doesn't bleed across navigations.
 *
 * Overlay flags + working-hours config are higher-stakes user preferences and
 * still persist via localStorage.
 */
interface PersistedPrefs {
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
    return {
      overlay: {
        dayNight: Boolean(parsed.overlay?.dayNight),
        workHours: Boolean(parsed.overlay?.workHours),
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
