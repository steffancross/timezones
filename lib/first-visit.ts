/**
 * First-visit detection for one-time onboarding hints (the Settings nudge, the
 * range coachmark). Keyed so each hint dismisses independently.
 *
 * The site is server-rendered on Cloudflare Workers, which has no memory of
 * past visits, so this is necessarily client-only — any UI it drives appears
 * after hydration. We use dedicated localStorage flags rather than reusing the
 * absence of `converter_prefs`: that would conflate "first visit" with "cleared
 * storage" and would vanish the moment any pref is written.
 */
export const SETTINGS_HINT_KEY = 'wtz_seen';
export const RANGE_HINT_KEY = 'wtz_range_seen';

export function isFirstVisit(key: string = SETTINGS_HINT_KEY): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(key) === null;
  } catch {
    // Private mode / storage unavailable — treat as a returning visitor so we
    // never nag someone who can't dismiss the hint persistently.
    return false;
  }
}

export function markVisited(key: string = SETTINGS_HINT_KEY): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Quota exceeded or storage unavailable; silently ignore.
  }
}
