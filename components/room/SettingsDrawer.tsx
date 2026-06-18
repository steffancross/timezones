'use client';

// Settings drawer (spec 2): an established participant edits their name and
// timezone, sets/changes/removes their password, and renames the room (flat
// ownership — any participant may rename). No Drawer primitive exists, so this
// reuses the Dialog shell. Wired to PATCH /me and PATCH /room.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { renameRoomRequest, updateIdentityRequest } from '@/lib/rooms/client';
import type { PublicParticipant } from '@/lib/rooms/db';
import { TimezoneField } from './TimezoneField';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  participant: Pick<PublicParticipant, 'displayName' | 'timezone' | 'hasPassword'>;
  roomName: string | null;
  /** Identity (name/timezone/password) saved — carries the updated row for the store. */
  onIdentitySaved?: (participant: PublicParticipant) => void;
  /** Room renamed — carries the new name for the store. */
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
  const [room, setRoom] = useState(roomName ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await action();
      setSaved(true);
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
        ...(newPassword ? { password: newPassword } : {}),
      });
      setNewPassword('');
      onIdentitySaved?.(updated); // push name/timezone into the store → live reflow
    });

  const removePassword = () =>
    run(async () => {
      const { participant: updated } = await updateIdentityRequest(roomId, { password: null });
      onIdentitySaved?.(updated);
    });

  const saveRoomName = () =>
    run(async () => {
      const { room: updated } = await renameRoomRequest(roomId, room);
      onRoomRenamed?.(updated.name);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ar-set-name">Your name</Label>
              <Input
                id="ar-set-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Your timezone</Label>
              <TimezoneField value={timezone} onChange={setTimezone} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ar-set-pw">
                {participant.hasPassword ? 'Change password' : 'Set a password'}
              </Label>
              <Input
                id="ar-set-pw"
                type="password"
                value={newPassword}
                placeholder="Choose a password"
                autoComplete="new-password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={busy || !name.trim()} onClick={saveIdentity}>
                Save
              </Button>
              {participant.hasPassword && (
                <Button size="sm" variant="outline" disabled={busy} onClick={removePassword}>
                  Remove password
                </Button>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ar-set-room">Room name</Label>
              <Input
                id="ar-set-room"
                value={room}
                maxLength={60}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !room.trim()}
              onClick={saveRoomName}
            >
              Rename room
            </Button>
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && !error && <p className="text-sm text-muted-foreground">Saved.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
