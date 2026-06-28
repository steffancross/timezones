import Link from 'next/link';
import { HeatmapMini } from './HeatmapMini';

function consensus(c: number, k: number): string {
  const h = k / 2;
  if (c >= 5) {
    if (h >= 11 && h < 14.5) return c === 5 && h >= 12 && h < 14 ? 's-all' : 's-some';
    return 's-none';
  }
  if (h >= 13 && h < 18) return c === 2 && h >= 15 && h < 16 ? 's-some' : 's-all';
  if ((h >= 11 && h < 13) || (h >= 18 && h < 20)) return 's-some';
  return 's-none';
}

export function AvailabilityRoomPromo() {
  return (
    <section
      className="mt-8 grid items-center gap-9 overflow-hidden rounded-[var(--radius-lg)] border border-border p-7"
      style={{
        gridTemplateColumns: '1.15fr 1fr',
        background:
          'linear-gradient(180deg, color-mix(in oklab, var(--avr-yes) 7%, hsl(var(--card))) 0%, hsl(var(--card)) 70%)',
      }}
    >
      {/* copy */}
      <div className="min-w-0">
        <p
          className="mb-3 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase"
          style={{ letterSpacing: '0.08em', color: 'var(--avr-ink)' }}
        >
          <span
            className="inline-block size-[7px] shrink-0 rounded-full"
            style={{ background: 'var(--avr-yes)' }}
          />
          Rooms
        </p>
        <h2 className="mb-2.5 text-[26px] font-semibold leading-[1.1] tracking-tight text-[color:var(--fg)]">
          Need a time that works for the whole group?
        </h2>
        <p className="mb-5 max-w-[46ch] text-[14.5px] leading-relaxed text-[color:var(--fg-muted)]">
          Converting one zone to another only gets you so far. Spin up a Room, share one link, and
          everyone paints when they&apos;re free.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            prefetch={false}
            href="/availability-room#create"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-lg)] px-4 text-sm font-medium"
            style={{
              background: 'var(--brand)',
              color: 'var(--brand-fg)',
              border: '1px solid var(--brand)',
            }}
          >
            Create a room
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 5 7 7-7 7" />
            </svg>
          </Link>
          <Link
            prefetch={false}
            href="/availability-room"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[color:var(--fg)] no-underline transition-colors hover:text-[color:var(--brand)]"
          >
            How it works
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* mini heatmap */}
      <div
        className="rounded-[var(--radius-lg)] border border-border bg-card p-3.5"
        style={{ boxShadow: '0 12px 28px -16px oklch(0 0 0 / 0.18)' }}
        aria-hidden="true"
      >
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold tracking-tight text-[color:var(--fg)]">
            Design sync · week of Jun 8
          </span>
          <span className="font-mono text-[10px] text-[color:var(--fg-subtle)]">5 people</span>
        </div>
        <HeatmapMini lo={18} hi={39} sm cellClass={consensus} />
        <div className="mt-2.5 flex items-center gap-3.5 border-t border-border pt-2.5 font-mono text-[10px] text-[color:var(--fg-subtle)]">
          <span className="inline-flex items-center gap-[5px]">
            <span
              className="inline-block size-[11px] shrink-0 rounded-[2px]"
              style={{ background: 'var(--av-yes-strong)' }}
            />
            everyone free
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <span
              className="inline-block size-[11px] shrink-0 rounded-[2px]"
              style={{ background: 'var(--av-soft-fill)' }}
            />
            if needed
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <span className="inline-block size-[11px] shrink-0 rounded-[2px] border border-border bg-card" />
            someone&apos;s out
          </span>
        </div>
      </div>
    </section>
  );
}
