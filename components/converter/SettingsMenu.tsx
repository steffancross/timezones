'use client';

import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConverterStore } from '@/components/converter/store-context';
import { isFirstVisit, markVisited, SETTINGS_HINT_KEY } from '@/lib/first-visit';
import { cn } from '@/lib/utils';
import { HintBubble } from './HintBubble';
import { WorkingHoursEditor } from './WorkingHoursEditor';

type OverlayKind = 'dayNight' | 'workHours' | 'weekend';

const OVERLAY_OPTIONS: Array<{ key: OverlayKind; label: string }> = [
  { key: 'dayNight', label: 'Day / night' },
  { key: 'weekend', label: 'Weekend' },
  { key: 'workHours', label: 'Working hours' },
];

export function SettingsMenu() {
  const dayNight = useConverterStore((s) => s.overlay.dayNight);
  const workHours = useConverterStore((s) => s.overlay.workHours);
  const weekend = useConverterStore((s) => s.overlay.weekend);
  const toggleDayNight = useConverterStore((s) => s.toggleDayNightOverlay);
  const toggleWorkHours = useConverterStore((s) => s.toggleWorkHoursOverlay);
  const toggleWeekend = useConverterStore((s) => s.toggleWeekendOverlay);

  const checkedFor = (k: OverlayKind) =>
    k === 'dayNight' ? dayNight : k === 'workHours' ? workHours : weekend;
  const toggleFor = (k: OverlayKind) =>
    k === 'dayNight' ? toggleDayNight : k === 'workHours' ? toggleWorkHours : toggleWeekend;

  // One-time first-visit nudge pointing at the gear. Owned here (not in a
  // sibling) so opening the menu can hide the live bubble, not just set the
  // localStorage flag. Renders nothing on the server + first client render to
  // avoid a hydration mismatch, then flips on in the mount effect.
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (isFirstVisit(SETTINGS_HINT_KEY)) setShowHint(true);
  }, []);
  const dismissHint = () => {
    markVisited(SETTINGS_HINT_KEY);
    setShowHint(false);
  };

  return (
    <div className="relative">
      <Popover
        onOpenChange={(open) => {
          // Opening Settings counts as discovering the feature — retire the hint
          // immediately (both the visible bubble and future visits).
          if (open) dismissHint();
        }}
      >
        <PopoverTrigger
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-[var(--radius)]',
            'border border-[color:var(--border)] bg-card',
            'text-[color:var(--fg-muted)] transition-colors',
            'hover:bg-[var(--hover)] hover:text-[color:var(--fg)]',
          )}
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[300px] p-3.5">
          <section>
            <h4 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--fg-subtle)]">
              Overlays
            </h4>
            <div className="space-y-1.5">
              {OVERLAY_OPTIONS.map((opt) => (
                <div key={opt.key}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                    <CheckSquare checked={checkedFor(opt.key)} />
                    <input
                      type="checkbox"
                      checked={checkedFor(opt.key)}
                      onChange={toggleFor(opt.key)}
                      className="sr-only"
                    />
                    <span className="flex-1">{opt.label}</span>
                    <Swatch kind={opt.key} />
                  </label>
                  {opt.key === 'workHours' && workHours && <WorkingHoursEditor />}
                </div>
              ))}
            </div>
          </section>
        </PopoverContent>
      </Popover>

      {showHint && (
        <HintBubble
          onDismiss={dismissHint}
          arrow={{ side: 'top', className: 'right-3' }}
          className="absolute right-0 top-full z-50 mt-2"
        >
          Bands show each place's <span className="text-[color:var(--fg)]">working hours</span> and{' '}
          <span className="text-[color:var(--fg)]">weekends</span> — adjust them in Settings.
        </HintBubble>
      )}
    </div>
  );
}

function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-block size-4 shrink-0 rounded-[3px] border-[1.5px] transition-colors',
        checked
          ? 'border-[color:var(--brand)] bg-[var(--brand)]'
          : 'border-[color:var(--border-strong)] bg-transparent',
      )}
    >
      {checked && (
        <svg
          viewBox="0 0 12 12"
          className="absolute inset-0 size-full text-[color:var(--brand-fg)]"
          aria-hidden="true"
        >
          <path
            d="M2.5 6.2 L5 8.5 L9.5 3.7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function Swatch({ kind }: { kind: OverlayKind }) {
  const bg =
    kind === 'dayNight'
      ? 'color-mix(in oklab, var(--band-night) calc(var(--band-night-alpha) * 100%), transparent)'
      : kind === 'workHours'
        ? 'color-mix(in oklab, var(--band-work) calc(var(--band-work-alpha) * 100%), transparent)'
        : 'color-mix(in oklab, var(--band-weekend) calc(var(--band-weekend-alpha) * 100%), transparent)';

  return (
    <span
      aria-hidden="true"
      className="inline-block h-3 w-[22px] shrink-0 rounded-[2px] border border-[color:var(--border)]"
      style={{ background: bg }}
    />
  );
}
