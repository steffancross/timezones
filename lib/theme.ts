export type Theme = 'light' | 'dark' | 'system';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem('theme');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.setAttribute('data-theme', resolved);

  if (theme === 'system') {
    window.localStorage.removeItem('theme');
  } else {
    window.localStorage.setItem('theme', theme);
  }
}
