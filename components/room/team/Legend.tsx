// Heatmap legend. Group variant explains the three aggregate grades; solo variant
// (one responder — spec 7b) explains a single person's own week, since there's no
// "everyone" to aggregate yet. Heatmap variant (spec E) shows the 5-step count ramp.

const GROUP_ITEMS = [
  { label: 'Everyone available', bg: 'var(--hm-all)' },
  { label: `Works — someone's on "if needed"`, bg: 'var(--paint-soft)' },
  { label: "Someone's out", bg: 'transparent' },
] as const;

const SOLO_ITEMS = [
  { label: 'Available', bg: 'var(--av-yes-strong)' },
  { label: 'If needed', bg: 'var(--paint-soft)' },
  { label: 'Unavailable', bg: 'transparent' },
] as const;

export function Legend({ variant = 'group' }: { variant?: 'group' | 'solo' | 'heatmap' }) {
  if (variant === 'heatmap') {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((l) => (
            <span
              key={l}
              className="inline-block size-3 rounded-[3px] border border-border"
              style={{ background: `var(--hm-l${l})` }}
            />
          ))}
          <span className="ml-1.5">fewer → more can make it</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-[3px] border border-border"
            style={{ background: 'transparent' }}
          />
          Nobody can
        </span>
      </div>
    );
  }

  const items = variant === 'solo' ? SOLO_ITEMS : GROUP_ITEMS;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 py-3 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-[3px] border border-border"
            style={{ background: it.bg }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
