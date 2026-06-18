'use client';

// Contribute modal (spec 2): turns a lurker into a named participant. Owned by
// this spec, *triggered* by spec 5 when someone taps into the Availability tab
// while `you` is null. Name is prefilled with a friendly handle; timezone is
// auto-detected; password is optional and collapsed (clobber-prevention, not
// security). "Used this room before? Find me" hands off to the recovery picker.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createParticipantRequest } from '@/lib/rooms/client';
import type { PublicParticipant } from '@/lib/rooms/db';
import { randomHandle } from '@/lib/rooms/handles';
import { TimezoneField } from './TimezoneField';

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  /** Called after a participant is created; carries the new public participant. */
  onJoined?: (participant: PublicParticipant) => void;
  /** Called when the visitor chooses "Find me" — the host opens the recovery picker. */
  onRecover?: () => void;
}

export function ContributeModal({ open, onOpenChange, roomId, onJoined, onRecover }: Props) {
  // Lazy initial state so the handle is stable across re-renders while open.
  const [name, setName] = useState(randomHandle);
  const [detected] = useState(detectTimezone);
  const [timezone, setTimezone] = useState(detected);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const { participant } = await createParticipantRequest(roomId, {
        name,
        timezone,
        ...(showPassword && password ? { password } : {}),
      });
      onJoined?.(participant);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join the room</DialogTitle>
          <DialogDescription>
            Drop your name and timezone — no account, no calendar hookup.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!submitting) submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ar-name">Name</Label>
            <Input
              id="ar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Timezone</Label>
            <TimezoneField value={timezone} detected={detected} onChange={setTimezone} />
          </div>

          {showPassword ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ar-password">Password (optional)</Label>
              <Input
                id="ar-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Lets you edit from another device. There's no email recovery — if you lose both this
                password and this browser, you can't edit this entry again.
              </p>
            </div>
          ) : (
            <button
              type="button"
              className="self-start text-sm text-primary underline-offset-4 hover:underline"
              onClick={() => setShowPassword(true)}
            >
              Set a password so you can edit from another device
            </button>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={onRecover}
            >
              Used this room before? Find me
            </button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Joining…' : 'Join the room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
