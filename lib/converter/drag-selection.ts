'use client';

import { useEffect } from 'react';
import { useConverterStore } from '@/lib/store/converter';

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
 */

type DragMode = 'new' | 'resize';

let dragMode: DragMode | null = null;
let pivotHour: number | null = null;

export function startNewDrag(hour: number): void {
  dragMode = 'new';
  pivotHour = hour;
  useConverterStore.getState().setRange(hour, hour);
}

export function startResizeDrag(side: 'start' | 'end'): void {
  const { rangeStart, rangeEnd } = useConverterStore.getState();
  if (rangeStart === null) return;
  const end = rangeEnd ?? rangeStart;
  // Pivot is the edge we're NOT grabbing.
  pivotHour = side === 'start' ? end : rangeStart;
  dragMode = 'resize';
}

export function extendDrag(hour: number): void {
  if (dragMode === null || pivotHour === null) return;
  useConverterStore.getState().setRange(pivotHour, hour);
}

function endDrag(): void {
  dragMode = null;
  pivotHour = null;
}

export function isDragging(): boolean {
  return dragMode !== null;
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
