// Three-state legend for the heatmap.

const ITEMS = [
  { label: 'Everyone available', bg: 'var(--hm-all)' },
  { label: "Works — someone's on “if needed”", bg: 'var(--hatch-soft)' },
  { label: "Someone's out", bg: 'transparent' },
] as const;

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 py-3 text-xs text-muted-foreground">
      {ITEMS.map((it) => (
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
