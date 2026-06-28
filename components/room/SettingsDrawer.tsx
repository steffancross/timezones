'use client';

// Settings drawer (spec 2): an established participant edits their name and
// timezone, sets/changes/removes their password, and renames the room (flat
// ownership — any participant may rename). No Drawer primitive exists, so this
// reuses the Dialog shell. Wired to PATCH /me and PATCH /room.

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { renameRoomRequest, updateIdentityRequest } from '@/lib/rooms/client';
import type { PublicParticipant } from '@/lib/rooms/db';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TimezoneField } from './TimezoneField';

// Sentinel displayed when a password is already set. We never receive the real
// value from the server — only `hasPassword: boolean`. Showing dots signals
// "set" to the user; we don't re-send the field unless they change it.
const PW_SENTINEL = '••••••••';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  participant: Pick<PublicParticipant, 'displayName' | 'timezone' | 'hasPassword'>;
  roomName: string | null;
  onIdentitySaved?: (participant: PublicParticipant) => void;
  onRoomRenamed?: (name: string) => void;
}

export function SettingsDrawer({
  open,
  onOpenChange,
  roomId,
  participant,
  roomName,
  onIdentitySaved,
  onRoomRenamed,
}: Props) {
  const [name, setName] = useState(participant.displayName);
  const [timezone, setTimezone] = useState(participant.timezone);
  const [password, setPassword] = useState(participant.hasPassword ? PW_SENTINEL : '');
  const [room, setRoom] = useState(roomName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form to current values whenever the modal opens, so a closed-without-
  // saving state doesn't bleed into the next open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resets form on open only — adding participant fields would re-reset mid-session on background store updates
  useEffect(() => {
    if (!open) return;
    setName(participant.displayName);
    setTimezone(participant.timezone);
    setPassword(participant.hasPassword ? PW_SENTINEL : '');
    setRoom(roomName ?? '');
    setError(null);
  }, [open]);

  const isDirtyIdentity =
    name !== participant.displayName ||
    timezone !== participant.timezone ||
    (password !== PW_SENTINEL && password !== '');
  const isDirtyRoom = room !== (roomName ?? '');

  async function run(action: () => Promise<void>, successMsg = 'Saved') {
    setBusy(true);
    setError(null);
    try {
      await action();
      toast.success(successMsg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  const saveIdentity = () =>
    run(async () => {
      const { participant: updated } = await updateIdentityRequest(roomId, {
        name,
        timezone,
        // Don't send the sentinel back — only send if user actually typed a new value
        ...(password && password !== PW_SENTINEL ? { password } : {}),
      });
      if (updated.hasPassword) setPassword(PW_SENTINEL);
      onIdentitySaved?.(updated);
    });

  const removePassword = () =>
    run(async () => {
      const { participant: updated } = await updateIdentityRequest(roomId, { password: null });
      setPassword('');
      onIdentitySaved?.(updated);
    }, 'Password removed');

  const saveRoomName = () =>
    run(async () => {
      const { room: updated } = await renameRoomRequest(roomId, room);
      onRoomRenamed?.(updated.name);
    }, 'Room renamed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-form-type="other">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Identity */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ar-set-name">Your name</Label>
              <Input
                id="ar-set-name"
                value={name}
                maxLength={60}
                autoComplete="off"
                data-bwignore="true"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Your timezone</Label>
              <TimezoneField value={timezone} onChange={setTimezone} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ar-set-pw">Password</Label>
              <Input
                id="ar-set-pw"
                type="text"
                value={password}
                placeholder={participant.hasPassword ? undefined : 'Set a password (optional)'}
                autoComplete="new-password"
                data-bwignore="true"
                onChange={(e) => setPassword(e.target.value)}
              />
              {participant.hasPassword && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={removePassword}
                  className="self-start text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  Remove password
                </button>
              )}
            </div>
            <Button
              size="sm"
              disabled={busy || !name.trim() || !isDirtyIdentity}
              onClick={saveIdentity}
            >
              Save
            </Button>
          </section>

          {/* Room */}
          <section className="flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ar-set-room">Room name</Label>
              <Input
                id="ar-set-room"
                value={room}
                maxLength={60}
                autoComplete="off"
                data-bwignore="true"
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !room.trim() || !isDirtyRoom}
              onClick={saveRoomName}
            >
              Rename room
            </Button>
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-[11px] text-muted-foreground/60">
            Rooms are deleted after 180 days without anyone opening them.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
