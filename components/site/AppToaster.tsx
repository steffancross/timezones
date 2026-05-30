'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Toaster that follows the app's light/dark theme. Sonner defaults to "light",
 * and the app tracks theme via a `data-theme` attribute on <html> (manual
 * toggle in ThemeToggle, no next-themes / no OS detection). We mirror that
 * attribute into sonner's `theme` prop and keep it in sync with a
 * MutationObserver so toasts re-theme live when the toggle flips.
 *
 * Initial render is 'light' on both server and client (matching ThemeToggle's
 * own hydration pattern); the effect corrects it on mount. Toasts only appear
 * on user action, well after that, so dark-mode users never see a light toast.
 */
export function AppToaster() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return <Toaster position="top-center" theme={theme} />;
}
