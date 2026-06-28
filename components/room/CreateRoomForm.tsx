'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createParticipantRequest, createRoomRequest } from '@/lib/rooms/client';
import { randomHandle } from '@/lib/rooms/handles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TimezoneField } from './TimezoneField';

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function CreateRoomForm() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [name, setName] = useState(randomHandle);
  const [detected] = useState(detectTimezone);
  const [timezone, setTimezone] = useState(detected);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const { id } = await createRoomRequest(roomName.trim() || undefined);
      await createParticipantRequest(id, {
        name: name.trim(),
        timezone,
        ...(showPassword && password ? { password } : {}),
      });
      router.push(`/r/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="off">
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="cr-room-name"
          className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fg-muted)]"
        >
          Room name
        </Label>
        <Input
          id="cr-room-name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="e.g. Design sync, Q3 planning…"
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="cr-your-name"
            className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fg-muted)]"
          >
            Your name
          </Label>
          <Input
            id="cr-your-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="You"
            required
            disabled={submitting}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fg-muted)]">
            Your timezone
          </Label>
          <TimezoneField value={timezone} detected={detected} onChange={setTimezone} />
        </div>
      </div>

      {showPassword ? (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="cr-password"
            className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fg-muted)]"
          >
            Password
            <span className="ml-1.5 font-normal normal-case tracking-normal text-[color:var(--fg-subtle)]">
              — optional
            </span>
          </Label>
          <Input
            id="cr-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Prevents others from editing as you"
            disabled={submitting}
          />
          <p className="text-[11.5px] leading-relaxed text-[color:var(--fg-subtle)]">
            Without a password, anyone with the room link can log in as you and edit your times.
            Setting one locks your slot so only you can claim it.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="self-start text-[12.5px] text-[color:var(--fg-muted)] underline decoration-dashed underline-offset-2 hover:text-[color:var(--fg)]"
        >
          Add a password (optional)
        </button>
      )}

      {error && <p className="text-[13px] text-[color:var(--destructive)]">{error}</p>}

      <div className="flex items-center gap-4 pt-1">
        <Button type="submit" disabled={submitting || !name.trim()} className="h-10 px-5">
          {submitting ? 'Creating…' : 'Create room'}
          {!submitting && (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 5 7 7-7 7" />
            </svg>
          )}
        </Button>
      </div>
    </form>
  );
}
