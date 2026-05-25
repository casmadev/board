import { useCallback, useRef } from 'react';
import type { Camera } from '../types';
import { DRAG_THRESHOLD_PX } from '../constants';

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startShapeX: number;
  startShapeY: number;
  active: boolean;
}

interface Options {
  cameraRef: React.MutableRefObject<Camera>;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}

/**
 * Returns a factory that produces pointer handlers for a single shape.
 * Drag promotion uses a 4px threshold so taps still register as selection.
 */
export function useDragShape({ cameraRef, onSelect, onMove }: Options) {
  const stateRef = useRef<Record<string, DragState>>({});

  const createHandlers = useCallback(
    (id: string, currentX: number, currentY: number) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onSelect(id);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        stateRef.current[id] = {
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startShapeX: currentX,
          startShapeY: currentY,
          active: false,
        };
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        const s = stateRef.current[id];
        if (!s || s.pointerId !== e.pointerId) return;
        const dx = e.clientX - s.startClientX;
        const dy = e.clientY - s.startClientY;
        if (!s.active && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        s.active = true;
        const zoom = cameraRef.current.zoom;
        onMove(id, s.startShapeX + dx / zoom, s.startShapeY + dy / zoom);
      },
      onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
        const s = stateRef.current[id];
        if (!s || s.pointerId !== e.pointerId) return;
        delete stateRef.current[id];
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      },
      onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
        const s = stateRef.current[id];
        if (!s || s.pointerId !== e.pointerId) return;
        delete stateRef.current[id];
      },
    }),
    [cameraRef, onSelect, onMove],
  );

  return createHandlers;
}
