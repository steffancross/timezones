'use client';

// The room's "copy the link" affordance, extracted so the header and the
// cold-start states (empty / just-you) share one implementation. Rooms spread by
// the shared link — there's no invite list — so this is the core growth action.

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  label?: string;
}

export function ShareRoomButton({ className, label = 'Share' }: Props) {
  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Room link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-[var(--hover)]',
        className,
      )}
      onClick={share}
    >
      <Share2 className="size-3" />
      {label}
    </button>
  );
}
