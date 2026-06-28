'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function extractRoomId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Extract roomId from full URL: http://…/r/<roomId>[?…]
  const match = trimmed.match(/\/r\/([^/?#]+)/);
  if (match) return match[1] ?? null;
  // Bare code — must look like a valid slug (alphanumeric + dashes)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}

export function JoinRoomPanel() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleGo() {
    const roomId = extractRoomId(value);
    if (!roomId) {
      setError('Enter a room code or paste a room link.');
      return;
    }
    setError(null);
    router.push(`/r/${roomId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleGo();
  }

  return (
    <div
      className="flex flex-col justify-center rounded-[var(--radius-lg)] border border-border p-7"
      style={{
        borderLeft: '1px solid hsl(var(--border))',
        background: 'color-mix(in oklab, var(--avr-yes) 4%, hsl(var(--card)))',
      }}
    >
      <p
        className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.07em]"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Already have a room?
      </p>
      <h3 className="mb-1.5 text-[17px] font-semibold tracking-tight text-[color:var(--fg)]">
        Jump back in
      </h3>
      <p className="mb-5 text-[13px] leading-relaxed text-[color:var(--fg-muted)]">
        Paste a room link or enter a room code to open it directly.
      </p>

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Paste link or enter code…"
          className="flex-1"
          aria-label="Room link or code"
        />
        <Button type="button" onClick={handleGo} className="shrink-0">
          Go
        </Button>
      </div>

      {error && <p className="mt-2 text-[12px] text-[color:var(--destructive)]">{error}</p>}
    </div>
  );
}
