'use client';

// Recovery picker (spec 2): the new-device / cleared-cookie path. Lists the
// room's participants (name + timezone distinguisher + a lock when passworded)
// and lets the visitor deliberately re-claim one. "I'm new" is the DEFAULT,
// structural safeguard — becoming an existing person is an explicit choice, so
// nobody clobbers someone else's week by reflex. A passworded pick prompts.

import { LockIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { claimRequest, listClaimableRequest } from '@/lib/rooms/client';
import type { ClaimableParticipant } from '@/lib/rooms/identity';
import { cn } from '@/lib/utils';

// Stable per-participant avatar hue so two same-named people read as distinct.
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  /** Re-claimed an existing participant. */
  onClaimed?: (youId: string) => void;
  /** Chose "I'm new" — host should open the contribute modal instead. */
  onNew?: () => void;
}

export function RecoveryPicker({ open, onOpenChange, roomId, onClaimed, onNew }: Props) {
  const [people, setPeople] = useState<ClaimableParticipant[] | null>(null);
  const [selected, setSelected] = useState<ClaimableParticipant | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the claimable list each time the picker opens.
  useEffect(() => {
    if (!open) return;
    setPeople(null);
    setSelected(null);
    setPassword('');
    setError(null);
    listClaimableRequest(roomId)
      .then(setPeople)
      .catch(() => setError('Could not load the list'));
  }, [open, roomId]);

  async function claimPerson(person: ClaimableParticipant) {
    // A passworded participant needs the password entered first.
    if (person.hasPassword && selected?.participantId !== person.participantId) {
      setSelected(person);
      setPassword('');
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { you } = await claimRequest(roomId, {
        participantId: person.participantId,
        ...(person.hasPassword ? { password } : {}),
      });
      onClaimed?.(you.participantId);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not claim');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Find yourself</DialogTitle>
          <DialogDescription>
            Pick the entry that's you to edit it from this device, or start fresh.
          </DialogDescription>
        </DialogHeader>

        <Button variant="outline" className="justify-start" onClick={onNew}>
          I'm new — create a new entry
        </Button>

        <div className="flex flex-col gap-1">
          {people === null && !error && (
            <p className="px-1 py-2 text-sm text-muted-foreground">Loading…</p>
          )}
          {people?.length === 0 && (
            <p className="px-1 py-2 text-sm text-muted-foreground">Nobody's joined yet.</p>
          )}
          {people?.map((p) => {
            const active = selected?.participantId === p.participantId;
            return (
              <div key={p.participantId} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => claimPerson(p)}
                  disabled={busy}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent',
                    active && 'bg-accent',
                  )}
                >
                  <span
                    aria-hidden
                    className="size-7 shrink-0 rounded-full"
                    style={{ backgroundColor: `hsl(${hueFor(p.participantId)} 60% 55%)` }}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {p.displayName}
                      {p.hasPassword && (
                        <LockIcon
                          className="size-3 text-muted-foreground"
                          aria-label="password protected"
                        />
                      )}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.distinguisher}
                    </span>
                  </span>
                </button>

                {active && p.hasPassword && (
                  <div className="flex flex-col gap-2 px-2 pb-2 pt-1">
                    <Input
                      type="password"
                      value={password}
                      placeholder="Password"
                      autoComplete="off"
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !busy && password) claimPerson(p);
                      }}
                    />
                    <Button size="sm" disabled={busy || !password} onClick={() => claimPerson(p)}>
                      {busy ? 'Claiming…' : 'This is me'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
