'use client';

import { useEffect, useState } from 'react';
import { useConverterStore } from '@/components/converter/store-context';
import { isFirstVisit, markVisited, RANGE_HINT_KEY } from '@/lib/first-visit';
import { HintBubble } from './HintBubble';

/**
 * One-time coachmark teaching the drag-to-select range interaction. Rendered
 * inside the (relative) zones card, so it only appears once the strip is on
 * screen. Like the Settings hint it renders nothing on the server + first
 * client render, then flips on in a mount effect.
 */
export function RangeHint() {
  const rangeStartMin = useConverterStore((s) => s.rangeStartMin);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isFirstVisit(RANGE_HINT_KEY)) setShow(true);
  }, []);

  // Doing the action teaches it better than the tip — the moment the user
  // starts a selection, retire the hint for good.
  useEffect(() => {
    if (rangeStartMin !== null && show) {
      markVisited(RANGE_HINT_KEY);
      setShow(false);
    }
  }, [rangeStartMin, show]);

  if (!show) return null;

  const dismiss = () => {
    markVisited(RANGE_HINT_KEY);
    setShow(false);
  };

  return (
    <HintBubble
      onDismiss={dismiss}
      arrow={{ side: 'bottom', className: 'left-1/2 -translate-x-1/2' }}
      className="absolute left-1/2 top-2 z-20 -translate-x-1/2"
    >
      Click and drag across any row to select a time range.
    </HintBubble>
  );
}
