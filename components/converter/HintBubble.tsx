'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Presentational one-time onboarding bubble: a small dismissable callout with an
 * optional pointer arrow. Visibility + first-visit logic live in the caller
 * (SettingsMenu, RangeHint) so the owning component can also hide it in response
 * to the user performing the action it describes.
 *
 * The bubble is positioned by the `className` the caller passes (it should be
 * `absolute`, which also makes it the positioning context for the arrow).
 */
export function HintBubble({
  children,
  onDismiss,
  className,
  arrow,
}: {
  children: ReactNode;
  onDismiss: () => void;
  className?: string;
  arrow?: { side: 'top' | 'bottom'; className?: string };
}) {
  return (
    <div
      role="status"
      className={cn(
        'w-max max-w-[240px] rounded-[var(--radius)] border border-border bg-card',
        'px-3 py-2.5 text-[12px] leading-snug text-[color:var(--fg-muted)] shadow-md',
        className,
      )}
    >
      {arrow && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute size-2.5 rotate-45 bg-card',
            arrow.side === 'top'
              ? '-top-[5px] border-l border-t border-border'
              : '-bottom-[5px] border-b border-r border-border',
            arrow.className,
          )}
        />
      )}
      <div className="flex items-start gap-2">
        <p className="flex-1">{children}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss tip"
          className={cn(
            'mt-px shrink-0 rounded-[3px] p-0.5 text-[color:var(--fg-subtle)] transition-colors',
            'hover:bg-[var(--hover)] hover:text-[color:var(--fg)]',
          )}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
