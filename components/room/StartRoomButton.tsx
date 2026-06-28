'use client';

// "Start a new room" — creates a fresh room and navigates into it. The reusable
// seam for the create path: used by the room dead-end now, and by the main-app
// CTA once that's wired up (deferred). Styling is plain for now (final pass
// later); it must never itself look broken, so failures surface inline.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createRoomRequest } from '@/lib/rooms/client';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  label?: string;
}

export function StartRoomButton({ className, label = 'Start a new room' }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const { id } = await createRoomRequest();
      router.push(`/r/${id}`);
    } catch {
      setError("Couldn't start a room. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className={cn(
          'rounded-[var(--radius)] border border-border bg-card px-4 py-2 text-sm hover:bg-[var(--hover)] disabled:opacity-60',
          className,
        )}
      >
        {pending ? 'Starting…' : label}
      </button>
      {error && <p className="text-sm text-[color:var(--fg-muted)]">{error}</p>}
    </div>
  );
}
