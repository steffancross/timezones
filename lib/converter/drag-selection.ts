'use client';

import { useEffect, useMemo } from 'react';
import { useConverterStoreApi } from '@/components/converter/store-context';

/**
 * Range drag controller.
 *
 * Two drag modes:
 * - 'new'    — pointer-down on a tile starts a fresh range whose pivot is
 *              that tile. Pointer-up without movement collapses to a click
 *              (1-tile block at the pivot).
 * - 'resize' — pointer-down on a range edge handle keeps the OPPOSITE edge
 *              fixed and lets the grabbed edge follow the pointer. The
 *              fixed edge becomes the pivot.
 *
 * Either way, the live block is always `[min(pivot, cursor), max(pivot, cursor)]`,
 * written into the store via `setRange`.
 *
 * Drag state (mode + pivot) is module-level because at most one drag is ever
 * active globally — there's only one converter on a page. The store reference
 * is per-mount, bound via the `useDragSelection` hook below.
 */

type DragMode = 'new' | 'resize';

let dragMode: DragMode | null = null;
let pivotHour: number | null = null;

function endDrag(): void {
  dragMode = null;
  pivotHour = null;
}

/**
 * Returns drag actions bound to the per-mount converter store from context.
 * Call inside HourTile / RangeBand to get `startNewDrag`, `extendDrag`, etc.
 */
export function useDragSelection() {
  const store = useConverterStoreApi();
  return useMemo(
    () => ({
      startNewDrag(hour: number) {
        dragMode = 'new';
        pivotHour = hour;
        store.getState().setRange(hour, hour);
      },
      startResizeDrag(side: 'start' | 'end') {
        const { rangeStart, rangeEnd } = store.getState();
        if (rangeStart === null) return;
        const end = rangeEnd ?? rangeStart;
        pivotHour = side === 'start' ? end : rangeStart;
        dragMode = 'resize';
      },
      extendDrag(hour: number) {
        if (dragMode === null || pivotHour === null) return;
        store.getState().setRange(pivotHour, hour);
      },
      isDragging(): boolean {
        return dragMode !== null;
      },
    }),
    [store],
  );
}

/**
 * Mount once near the top of the converter tree. Window-level pointerup /
 * pointercancel so a drag started on a tile resolves even when the pointer
 * is released outside the strip.
 */
export function useDragSelectionGlobalListener(): void {
  useEffect(() => {
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, []);
}
