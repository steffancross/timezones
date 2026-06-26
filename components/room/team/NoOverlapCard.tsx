'use client';

interface Props {
  onShowGrid: () => void;
  onSwitchHeatmap: () => void;
}

export function NoOverlapCard({ onShowGrid, onSwitchHeatmap }: Props) {
  return (
    <div className="flex min-h-36 flex-col items-start justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border p-6">
      <div>
        <div className="text-sm font-semibold">No overlap this week</div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Schedules don&apos;t cross for the current selection. Try a different week, or switch to
          heatmap view to find the time that works for the most people.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onSwitchHeatmap}
          className="text-xs text-[var(--brand)] hover:underline"
        >
          Switch to heatmap
        </button>
        <button
          type="button"
          onClick={onShowGrid}
          className="text-xs text-muted-foreground hover:underline"
        >
          Show grid anyway
        </button>
      </div>
    </div>
  );
}
