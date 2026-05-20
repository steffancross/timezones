'use client';

import { Globe2 } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="rounded-[var(--radius-lg,6px)] border border-dashed border-[color:var(--border-strong)] bg-card/50 p-16 text-center">
      <Globe2
        className="mx-auto size-8 text-[color:var(--fg-subtle)]"
        aria-hidden="true"
      />
      <p className="mt-3 text-[13px] text-[color:var(--fg-muted)]">
        Search above to add a time zone or city
      </p>
    </div>
  );
}
