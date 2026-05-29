/* Reusable "fit the camera to the board contents" helper, shared by the
   demos that want to frame their canvas on load instead of hard-coding a
   defaultCamera (which would assume a particular window size).

   Three layers, smallest to largest, so callers can take just what they
   need:
     • boundsOfShapes   — bounding box of a ShapesState (pure)
     • fitCameraToBounds — the Camera that frames a rect in a viewport (pure)
     • FitCameraToContents — a null-rendering component that wires the two to
                             the live board, framing once on mount.

   The pure functions carry the math (and are trivially testable); the
   component is the drop-in most demos use. */

import { useLayoutEffect } from 'react';
import { useCasmaBoard } from '@casmadev/board';
import type { Camera, ShapesState } from '@casmadev/board';

export type Bounds = { x: number; y: number; w: number; h: number };

/** Axis-aligned bounding box enclosing every shape in `state`. Returns null
 *  when the state holds no shapes (nothing to frame). */
export function boundsOfShapes(state: ShapesState): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of state.order) {
    const s = state.shapes[id];
    if (!s) continue;
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.w);
    maxY = Math.max(maxY, s.y + s.h);
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export interface FitCameraOptions {
  /** Fraction of the viewport the content should fill, leaving 1 − padding
   *  as margin. Default 0.9. */
  padding?: number;
  /** Cap on zoom. Default Infinity (zoom in to fill); pass 1 to keep a small
   *  cluster at its native size instead of magnifying it. */
  maxZoom?: number;
}

/** Pure camera math: the Camera that centers `bounds` in a viewport of
 *  `width`×`height`, scaled to fit with margin.
 *
 *  Derivation: the world maps to the screen by `screen = world * zoom +
 *  camera`, so to land the content's center on the viewport's center we
 *  need `camera = screenCenter − worldCenter * zoom`. */
export function fitCameraToBounds(
  viewport: { width: number; height: number },
  bounds: Bounds,
  { padding = 0.9, maxZoom = Infinity }: FitCameraOptions = {},
): Camera {
  const zoom = Math.min(
    maxZoom,
    (viewport.width * padding) / bounds.w,
    (viewport.height * padding) / bounds.h,
  );
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  return {
    x: viewport.width / 2 - cx * zoom,
    y: viewport.height / 2 - cy * zoom,
    zoom,
  };
}

export interface FitCameraToContentsProps extends FitCameraOptions {
  /** Region to frame. Defaults to the bounding box of every shape currently
   *  on the board (read once on mount). Pass an explicit rect to frame a
   *  fixed region regardless of what's on the canvas — e.g. a layout whose
   *  empty area still matters, or one with stray shapes to ignore. */
  bounds?: Bounds;
}

/**
 * Drop into any board slot. On mount it measures the viewport and centers +
 * fits the camera on `bounds` (or all shapes), then renders nothing and gets
 * out of the way so the user can pan / zoom freely.
 *
 * Runs in useLayoutEffect — after the DOM is laid out (so the viewport has a
 * real size) but before paint, so the very first frame the user sees is
 * already framed.
 */
export function FitCameraToContents({
  bounds,
  padding,
  maxZoom,
}: FitCameraToContentsProps) {
  const { viewportRef, setCamera, shapes } = useCasmaBoard();
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const target = bounds ?? boundsOfShapes(shapes);
    if (!target || target.w <= 0 || target.h <= 0) return;
    setCamera(fitCameraToBounds(rect, target, { padding, maxZoom }));
    // Frame once on mount; afterwards the camera is the user's to drive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
