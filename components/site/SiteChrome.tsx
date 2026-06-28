'use client';

// The marketing Header/Footer wrap every route via the root layout, but an
// Availability Room (`/r/*`) is a self-contained app surface with its own chrome
// (RoomTop + tabs) — the site header/footer would be redundant there. This thin
// client wrapper hides them on room routes. `usePathname()` is correct during
// SSR for client components, so there's no hydration flash. Header/Footer are
// still server components, passed in as already-rendered nodes.

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface Props {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export function SiteChrome({ header, footer, children }: Props) {
  const pathname = usePathname();
  const bare = pathname?.startsWith('/r/') ?? false;

  return (
    <>
      {!bare && header}
      <main className="flex-1">{children}</main>
      {!bare && footer}
    </>
  );
}
