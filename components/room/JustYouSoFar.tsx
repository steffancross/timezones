'use client';

// One responder ("just you so far") — spec 7b. We must NOT render the aggregate
// as consensus (one person's "free" would paint a misleading all-green
// "everyone available"). Instead this banner reframes the single-person view and
// elevates sharing — the whole point of this screen is to get a second person in.

import { ShareRoomButton } from './ShareRoomButton';

interface Props {
  /** Show a secondary "add yours" only when the viewer hasn't filled their own week. */
  youResponded?: boolean;
  onAddAvailability?: () => void;
}

export function JustYouSoFar({ youResponded = true, onAddAvailability }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-[var(--bg)] p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Just you so far</div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Share the link and your overlap with others will show up here.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ShareRoomButton label="Share the link" />
        {!youResponded && (
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-xs hover:bg-[var(--hover)]"
            onClick={onAddAvailability}
          >
            Add your availability
          </button>
        )}
      </div>
    </div>
  );
}
