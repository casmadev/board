import { useCasmaBoard } from '../context';
import { DRAG_THRESHOLD_PX, GRID_SIZE } from '../constants';
import { screenToWorld } from '../geometry/camera';
import type { Shape, ShapeKind } from '../types';

export interface ShapeCreationDragOptions<S extends Shape = Shape> {
  /** Factory invoked once when the gesture crosses the drag threshold.
   *  Receives the cursor's world point and should return a starting
   *  preview shape (plus its kind, so the board's preview slot can
   *  render with the right component). Returning `null` aborts the
   *  gesture silently — useful when a tool id doesn't map to a kind.
   *
   *  The shape's x/y are updated on subsequent moves via a stored
   *  cursor→shape offset, so any per-id randomness in your renderer
   *  (sticky wobble, etc.) stays stable through the gesture. */
  createInitialShape: (world: { x: number; y: number }) => {
    kind: ShapeKind<S>;
    shape: S;
  } | null;
}

/**
 * Returns a pointerdown handler that wires a "drag from this element
 * onto the canvas, release to spawn" gesture. Handles:
 *
 *   - the 4px drag threshold (sub-threshold gestures are no-ops, so the
 *     element's own onClick is free to fire for taps);
 *   - the live preview (via the board's `dragPreview` slot, painted at
 *     40% opacity inside .cb-world);
 *   - snap-to-grid on commit (mirrors the viewport-click path);
 *   - cancellation on Escape, on a secondary-button (right-click)
 *     pointerdown, or when the pointer is released outside the
 *     viewport.
 *
 * Use it from any custom toolbar / sidebar / picker UI:
 *
 * ```tsx
 * const startDrag = useShapeCreationDrag();
 * <button onPointerDown={(e) => startDrag(e, {
 *   createInitialShape: (world) => ({
 *     kind: stickyKind,
 *     shape: createStickyShape(generateId(), world.x, world.y, { color: 'pink' }),
 *   }),
 * })} />
 * ```
 */
export function useShapeCreationDrag() {
  const {
    addShape,
    setSelectedId,
    setTool,
    viewportRef,
    camera,
    snapToGrid,
    setDragPreview,
  } = useCasmaBoard();

  return function startDrag<S extends Shape>(
    e: React.PointerEvent,
    opts: ShapeCreationDragOptions<S>,
  ) {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragged = false;
    let preview:
      | { kind: ShapeKind<S>; shape: S; offsetX: number; offsetY: number }
      | null = null;

    const worldAt = (clientX: number, clientY: number) => {
      const el = viewportRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return screenToWorld(camera, {
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    };

    const cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerdown', onAuxDown, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('keydown', onKeyDown);
    };
    const cancel = () => {
      if (preview) setDragPreview(null);
      preview = null;
      cleanup();
    };

    // Snap a single axis to the grid when snap-to-grid is on. Applied to
    // the preview shape's position on every move so the ghost visibly
    // jumps to grid cells while the user is still dragging — committing
    // already snaps too, but the preview should match what the user is
    // about to drop.
    const snapAxis = (n: number) =>
      snapToGrid ? Math.round(n / GRID_SIZE) * GRID_SIZE : n;

    const onMove = (ev: PointerEvent) => {
      if (!dragged) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) {
          return;
        }
        dragged = true;
        const w = worldAt(ev.clientX, ev.clientY);
        if (!w) return;
        const initial = opts.createInitialShape(w);
        if (!initial) return;
        const snappedInitial: S = {
          ...initial.shape,
          x: snapAxis(initial.shape.x),
          y: snapAxis(initial.shape.y),
        };
        preview = {
          kind: initial.kind,
          shape: snappedInitial,
          // Offset baked in by kind.create (e.g. -w/2, -h/2 for centered
          // creation). Stored from the *unsnapped* values so subsequent
          // moves compute the raw target then re-snap to grid.
          offsetX: initial.shape.x - w.x,
          offsetY: initial.shape.y - w.y,
        };
        setDragPreview({ kind: initial.kind, shape: snappedInitial });
        return;
      }
      if (!preview) return;
      const w = worldAt(ev.clientX, ev.clientY);
      if (!w) return;
      const nextShape: S = {
        ...preview.shape,
        x: snapAxis(w.x + preview.offsetX),
        y: snapAxis(w.y + preview.offsetY),
      };
      preview.shape = nextShape;
      setDragPreview({ kind: preview.kind, shape: nextShape });
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      if (!dragged || !preview) {
        cleanup();
        return;
      }
      const el = viewportRef.current;
      if (!el) {
        cancel();
        return;
      }
      const rect = el.getBoundingClientRect();
      const overViewport =
        ev.clientX >= rect.left &&
        ev.clientX <= rect.right &&
        ev.clientY >= rect.top &&
        ev.clientY <= rect.bottom;
      if (!overViewport) {
        cancel();
        return;
      }
      const finalShape = { ...preview.shape } as S;
      if (snapToGrid) {
        finalShape.x = Math.round(finalShape.x / GRID_SIZE) * GRID_SIZE;
        finalShape.y = Math.round(finalShape.y / GRID_SIZE) * GRID_SIZE;
      }
      addShape(finalShape);
      setSelectedId(finalShape.id);
      setTool('select');
      setDragPreview(null);
      preview = null;
      cleanup();
    };

    const onAuxDown = (ev: PointerEvent) => {
      if (ev.button === 0) return;
      ev.preventDefault();
      cancel();
    };
    // Belt-and-suspenders cancel on right-click. Some browsers (and some
    // input configurations) don't fire a second pointerdown for button=2
    // while the primary button is still held, so the contextmenu event is
    // the only reliable signal. preventDefault suppresses the native menu.
    const onContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
      cancel();
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        cancel();
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointerdown', onAuxDown, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('keydown', onKeyDown);
  };
}
