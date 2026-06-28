'use client';

// Room identity bar: name + share path + avatar cluster + Share / Settings. This
// is the room's own chrome (the marketing header is hidden on /r/* by SiteChrome).

import { SettingsDrawer } from '@/components/room/SettingsDrawer';
import { Button } from '@/components/ui/button';
import { Settings2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from './Avatar';
import { useRoomData } from './room-data-context';

export function RoomTop() {
  const { state, youId } = useRoomData();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const you = youId ? state.participants.find((p) => p.id === youId) : undefined;
  const count = state.participants.length;

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
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold tracking-tight">
          {state.room.name?.trim() || 'Untitled room'}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {count} {count === 1 ? 'person' : 'people'} in the room
        </div>
      </div>

      <span className="flex-1" />

      <div className="flex items-center -space-x-1.5">
        {state.participants.slice(0, 5).map((p) => (
          <span key={p.id} className="rounded-full ring-2 ring-[hsl(var(--background))]">
            <Avatar id={p.id} name={p.displayName} size="sm" />
          </span>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={share}>
        <Share2 className="size-3.5" /> Share
      </Button>

      {you && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-4" />
          </Button>
          <SettingsDrawer
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            roomId={state.room.id}
            participant={you}
            roomName={state.room.name}
          />
        </>
      )}
    </div>
  );
}
