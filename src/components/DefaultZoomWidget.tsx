import { useCallback, useEffect, useRef } from 'react';
import { useCasmaBoard } from '../context';
import { clampZoom, zoomAtPoint } from '../geometry/camera';

const ZOOM_STEP = 1.2;
const TWEEN_MS = 220;

// Ease-out cubic — fast start, gentle settle. Matches the feel users expect
// from a click-driven step (snappy at the beginning, no overshoot).
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Default zoom widget rendered in the `bottomRight` slot. Shows the current
 * camera zoom as a percentage, with − / + buttons stepping by 1.2× (matching
 * the wheel-zoom feel) and a clickable percentage that snaps back to 100%.
 *
 * Each click runs a short rAF tween instead of snapping — the zoom eases
 * over ~220ms anchored on the viewport center so the visible center stays
 * put. Wheel zoom is unaffected (handled by usePanZoom for direct 1:1 feel).
 *
 * Pure consumer of `useCasmaBoard()` — exported so consumers can drop it
 * into any slot, or write their own using the same hook. Pass `null` to
 * `slots.bottomRight` to suppress it.
 */
export function DefaultZoomWidget() {
  const { camera, setCamera, viewportRef, messages } = useCasmaBoard();
  const rafRef = useRef<number | null>(null);

  // Cancel any in-flight tween on unmount so we don't update state after.
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const tweenZoom = useCallback(
    (target: number) => {
      const clampedTarget = clampZoom(target);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      // Anchor the zoom on the viewport center — captured once at tween
      // start so the same world point stays put through every frame.
      const rect = viewportRef.current?.getBoundingClientRect();
      const anchor = rect
        ? { x: rect.width / 2, y: rect.height / 2 }
        : { x: 0, y: 0 };
      const startZoom = camera.zoom;
      // Already at target (within float epsilon) → no-op, avoids a 1-frame
      // tween that produces no visible change.
      if (Math.abs(startZoom - clampedTarget) < 1e-4) return;
      const startTime = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startTime) / TWEEN_MS);
        const eased = easeOutCubic(t);
        const z = startZoom + (clampedTarget - startZoom) * eased;
        setCamera((prev) => zoomAtPoint(prev, z, anchor));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [camera.zoom, setCamera, viewportRef],
  );

  const pct = Math.round(camera.zoom * 100);

  return (
    <div className="cb-zoom" role="group" aria-label={`${pct}%`}>
      <button
        type="button"
        className="cb-zoom__btn"
        onClick={() => tweenZoom(camera.zoom / ZOOM_STEP)}
        aria-label={messages.aria.zoomOut}
      >
        −
      </button>
      <button
        type="button"
        className="cb-zoom__pct"
        onClick={() => tweenZoom(1)}
        aria-label={messages.aria.zoomReset}
      >
        {pct}%
      </button>
      <button
        type="button"
        className="cb-zoom__btn"
        onClick={() => tweenZoom(camera.zoom * ZOOM_STEP)}
        aria-label={messages.aria.zoomIn}
      >
        +
      </button>
    </div>
  );
}
