import { useCasmaBoard } from '../context';
import { DRAG_THRESHOLD_PX, GRID_SIZE } from '../constants';
import { screenToWorld } from '../geometry/camera';
import type { Shape, ShapeKind, ShapeKindToolButton } from '../types';
import type { Messages } from '../i18n';

export interface DefaultToolbarProps {
  /**
   * When `true`, clicking a kind button immediately creates the shape at
   * the viewport center (passes through `createShapeWithTool`, so snap-to-
   * grid still applies). The kind button is no longer a tool selector —
   * it doesn't show an active state, and `dragToCreate` is ignored
   * because the click itself is now the creation gesture.
   *
   * Useful for boards where every interaction should produce something
   * immediately rather than mode-switching the cursor. Default: `false`.
   */
  clickToCreate?: boolean;

  /**
   * When `true`, pressing down on a kind button and dragging past the
   * drag threshold lets the user release over the canvas to create the
   * shape at the release point — a quick alternative to the two-step
   * "pick tool → click canvas" flow. A pure tap still sets the tool so
   * the two-step flow keeps working.
   *
   * Ignored when `clickToCreate` is `true`. Default: `true`.
   */
  dragToCreate?: boolean;
}

/**
 * Default bottom-of-canvas tool picker. Renders a Select button plus one
 * button per shape kind that declares a `toolButton`. Reads the board's
 * `tool` + `setTool` from context, so the same component works whether
 * you drop it in the `slots.bottomCenter` slot or somewhere outside the
 * default chrome.
 *
 * Two creation-flow options control kind-button behavior — see
 * `DefaultToolbarProps`. Both are owned by this component; CasmaBoard is
 * intentionally agnostic so consumers can build their own toolbar with
 * a different policy.
 *
 * Build your own toolbar by reading `useCasmaBoard()` directly — every
 * piece of state this component uses is in the context.
 */
export function DefaultToolbar({
  clickToCreate = false,
  dragToCreate = true,
}: DefaultToolbarProps = {}) {
  const {
    tool,
    setTool,
    shapeKinds,
    messages,
    viewportRef,
    camera,
    createShapeWithTool,
    addShape,
    setSelectedId,
    generateId,
    snapToGrid,
    setDragPreview,
  } = useCasmaBoard();

  // Spawn at the screen-center of the viewport. createShapeWithTool handles
  // snap-to-grid if it's enabled on the board.
  const spawnAtViewportCenter = (toolId: string) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const world = screenToWorld(camera, {
      x: rect.width / 2,
      y: rect.height / 2,
    });
    createShapeWithTool(toolId, world);
  };

  // Wires the drag-from-toolbar gesture onto a kind button. Setting the
  // tool happens on pointerdown (so the existing tap-then-canvas flow
  // works for taps); document-level listeners track movement past the
  // drag threshold and, once active, render a live preview of the shape
  // under the cursor. Release over the viewport commits the previewed
  // shape (preserving the id so any per-id randomness — e.g. sticky's
  // wobble — stays stable between preview and final).
  //
  // Cancellation: Escape (keydown) or right-click (contextmenu /
  // secondary pointerdown) aborts the gesture, clearing the preview
  // without creating anything.
  //
  // Document listeners (not setPointerCapture) so the cursor reflects
  // whatever element is under the pointer — the .cb-root--cursor-add
  // crosshair already kicks in once the tool is set.
  const onKindButtonPointerDown =
    (toolId: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      setTool(toolId);
      const kind = shapeKinds.find((k) => (k.toolButton?.toolId ?? k.type) === toolId);
      if (!kind) return;

      const startX = e.clientX;
      const startY = e.clientY;
      let dragged = false;
      // Once dragged past the threshold we mint an id + base shape from
      // kind.create. The id is preserved through the gesture so commit
      // can call addShape with the same shape and keep per-id randomness.
      let previewState: {
        id: string;
        shape: Shape;
        // Offset baked into the shape by kind.create (typically -w/2, -h/2
        // for centered creation). Lets us reposition the shape on each
        // move without re-running kind.create (which would re-roll any
        // create-time randomness, e.g. the playground box's hue).
        offsetX: number;
        offsetY: number;
      } | null = null;

      const cleanup = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointerdown', onAuxDown, true);
        document.removeEventListener('contextmenu', onContextMenu, true);
        window.removeEventListener('keydown', onKeyDown);
      };
      const cancel = () => {
        if (previewState) setDragPreview(null);
        previewState = null;
        cleanup();
      };

      const worldAt = (clientX: number, clientY: number) => {
        const el = viewportRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return screenToWorld(camera, {
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      };

      const onMove = (ev: PointerEvent) => {
        if (!dragged) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) {
            return;
          }
          dragged = true;
          // Start the preview at the current cursor world point.
          const w = worldAt(ev.clientX, ev.clientY);
          if (!w) return;
          const id = generateId();
          const shape = kind.create(id, w.x, w.y);
          previewState = {
            id,
            shape,
            offsetX: shape.x - w.x,
            offsetY: shape.y - w.y,
          };
          setDragPreview({ kind, shape });
          return;
        }
        if (!previewState) return;
        const w = worldAt(ev.clientX, ev.clientY);
        if (!w) return;
        const nextShape: Shape = {
          ...previewState.shape,
          x: w.x + previewState.offsetX,
          y: w.y + previewState.offsetY,
        };
        previewState.shape = nextShape;
        setDragPreview({ kind, shape: nextShape });
      };

      const onUp = (ev: PointerEvent) => {
        // Only the primary button commits — secondary release is handled
        // by onAuxDown, not here.
        if (ev.button !== 0) return;
        if (!dragged || !previewState) {
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
        // Commit: snap to grid (if enabled) then add the shape directly.
        // Going through addShape rather than createShapeWithTool preserves
        // the previewed id (and any per-id randomness like sticky wobble).
        const finalShape: Shape = { ...previewState.shape };
        if (snapToGrid) {
          finalShape.x = Math.round(finalShape.x / GRID_SIZE) * GRID_SIZE;
          finalShape.y = Math.round(finalShape.y / GRID_SIZE) * GRID_SIZE;
        }
        addShape(finalShape);
        setSelectedId(finalShape.id);
        setTool('select');
        setDragPreview(null);
        previewState = null;
        cleanup();
      };

      // Secondary button (right / middle) during the gesture cancels.
      const onAuxDown = (ev: PointerEvent) => {
        if (ev.button === 0) return;
        ev.preventDefault();
        cancel();
      };
      // Suppress the native context menu during cancellation so the user
      // doesn't get a stray browser menu on the right-click.
      const onContextMenu = (ev: MouseEvent) => {
        ev.preventDefault();
      };
      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          cancel();
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      // Capture phase so we intercept secondary clicks before any other
      // handler (e.g. the viewport's deselect path) can react to them.
      document.addEventListener('pointerdown', onAuxDown, true);
      document.addEventListener('contextmenu', onContextMenu, true);
      window.addEventListener('keydown', onKeyDown);
    };

  // Resolve per-mode behavior once so the JSX stays clean. In click-to-
  // create mode the kind button isn't a selector, so we drop the active
  // class + aria-pressed and route its click through spawnAtViewportCenter.
  const kindButtonProps = (toolId: string) => {
    if (clickToCreate) {
      return {
        active: false,
        ariaPressed: undefined as boolean | undefined,
        onClick: () => spawnAtViewportCenter(toolId),
        onPointerDown: undefined as
          | undefined
          | React.PointerEventHandler<HTMLButtonElement>,
      };
    }
    return {
      active: tool === toolId,
      ariaPressed: tool === toolId,
      onClick: () => setTool(toolId),
      onPointerDown: dragToCreate ? onKindButtonPointerDown(toolId) : undefined,
    };
  };

  return (
    <div
      className="cb-toolbar"
      role="toolbar"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`cb-tool-btn${tool === 'select' ? ' cb-tool-btn--active' : ''}`}
        aria-pressed={tool === 'select'}
        title={messages.toolbar.select}
        aria-label={messages.toolbar.select}
        onClick={() => setTool('select')}
      >
        <SelectIcon />
      </button>
      {shapeKinds
        .filter((k): k is ShapeKind & { toolButton: ShapeKindToolButton } =>
          Boolean(k.toolButton),
        )
        .map((kind) => {
          const toolId = kind.toolButton.toolId ?? kind.type;
          const label = resolveLabel(kind.toolButton.label, messages);
          const p = kindButtonProps(toolId);
          return (
            <button
              key={toolId}
              type="button"
              className={`cb-tool-btn${p.active ? ' cb-tool-btn--active' : ''}`}
              aria-pressed={p.ariaPressed}
              title={label}
              aria-label={label}
              onClick={p.onClick}
              onPointerDown={p.onPointerDown}
            >
              {kind.toolButton.icon}
            </button>
          );
        })}
    </div>
  );
}

function resolveLabel(
  label: ShapeKindToolButton['label'],
  messages: Messages,
): string {
  return typeof label === 'function' ? label(messages) : label;
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden focusable={false}>
      <path d="M4 3l11 6-4.5 1.5L9 16 4 3z" fill="currentColor" />
    </svg>
  );
}
