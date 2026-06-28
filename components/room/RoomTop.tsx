'use client';

// Room identity bar: name + participant count + Share / Settings. This is the
// room's own chrome (the marketing header is hidden on /r/* by SiteChrome). No
// avatar cluster — without presence it would imply a liveness we don't track.

import { SettingsDrawer } from '@/components/room/SettingsDrawer';
import { ShareRoomButton } from '@/components/room/ShareRoomButton';
import { RecoveryPicker } from '@/components/room/RecoveryPicker';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useRoomStore } from './room-store-context';

export function RoomTop() {
  const state = useRoomStore((s) => s.state);
  const youId = useRoomStore((s) => s.youId);
  const demo = useRoomStore((s) => s.demo);
  const applyMyIdentity = useRoomStore((s) => s.applyMyIdentity);
  const setRoomName = useRoomStore((s) => s.setRoomName);
  const becomeParticipant = useRoomStore((s) => s.becomeParticipant);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const you = youId ? state.participants.find((p) => p.id === youId) : undefined;
  const count = state.participants.length;

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

      {demo && (
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Demo
        </span>
      )}

      {!demo && <ShareRoomButton />}

      {you && !demo && (
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
            onIdentitySaved={applyMyIdentity}
            onRoomRenamed={setRoomName}
            onSwitchPerson={() => {
              setSettingsOpen(false);
              setRecoveryOpen(true);
            }}
          />
          <RecoveryPicker
            open={recoveryOpen}
            onOpenChange={setRecoveryOpen}
            roomId={state.room.id}
            onClaimed={(claimedId) => {
              const p = state.participants.find((x) => x.id === claimedId);
              if (p) becomeParticipant(p, claimedId);
              setRecoveryOpen(false);
            }}
            onNew={() => setRecoveryOpen(false)}
          />
        </>
      )}
    </div>
  );
}
