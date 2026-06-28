'use client';

// Phone-width detection for the room's touch interactions. Mounted-guarded:
// returns false until mounted (so SSR and first client render agree — no
// hydration mismatch), then reflects the live media query. Use this ONLY to gate
// touch interactions (tap-sheet vs hover-sidebar, tap vs hover alignment line) —
// never initial layout. Layout switches belong in Tailwind breakpoints so there's
// no post-mount flash.

import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)'; // below Tailwind's `md` (768px)

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isMobile;
}
