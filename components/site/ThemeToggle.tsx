'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark';

/**
 * Two-segment light/dark toggle. Mirrors the segmented style of FormatToggle
 * (12/24) so the two controls feel like siblings.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  // Pre-hydration script in app/layout.tsx already applies the persisted theme
  // to <html data-theme>. Sync local state from the DOM on mount.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);

  function apply(next: Theme) {
    if (next === theme) return;
    if (next === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem('theme', next);
    } catch {
      // localStorage may be unavailable (private mode); runtime toggle still works.
    }
    setTheme(next);
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: matches FormatToggle pattern — role="group" + per-button aria-pressed is the standard segmented-toggle a11y.
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex h-8 items-center gap-0.5 rounded-[var(--radius)] border border-[color:var(--border)] bg-card p-0.5 "
    >
      <SegmentButton active={theme === 'light'} onClick={() => apply('light')} label="Light">
        <Sun className="h-5 w-3.5" aria-hidden />
      </SegmentButton>
      <SegmentButton active={theme === 'dark'} onClick={() => apply('dark')} label="Dark">
        <Moon className="h-5 w-3.5" aria-hidden />
      </SegmentButton>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-[3px] px-2.5 py-0.5 transition-colors',
        active
          ? 'bg-[color:var(--fg)] text-[color:var(--bg)]'
          : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
      )}
    >
      {children}
    </button>
  );
}
