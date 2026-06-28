'use client';

// Empty room (zero responders) — a get-started state, not a blank grid (spec 7b).
// Shown on Team and Overview when nobody has filled their week yet. Primary action
// is to add your own availability; sharing the link is how the room fills.

import { Button } from '@/components/ui/button';
import { ShareRoomButton } from './ShareRoomButton';

interface Props {
  onAddAvailability?: () => void;
}

export function RoomGetStarted({ onAddAvailability }: Props) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-base font-semibold">You're the first one here</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Add your week, then share the link — overlaps appear as people join.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" onClick={onAddAvailability}>
          Add your availability
        </Button>
        <ShareRoomButton />
      </div>
    </div>
  );
}
