import { useCasmaBoard } from '../context';
import { screenToWorld } from '../geometry/camera';
import { useShapeCreationDrag } from '../hooks/useShapeCreationDrag';
import type { ShapeKind, ShapeKindToolButton } from '../types';
import type { Messages } from '../i18n';

export interface DefaultToolbarProps {
  /**
   * When `true`, clicking a kind button immediately creates the shape at
   * the viewport center (passes through `createShapeWithTool`, so snap-to-
   * grid still applies). The kind button is no longer a tool selector —
   * it doesn't show an active state, and pointerdown won't change the
   * board's tool.
   *
   * Combines freely with `dragToCreate`: with both on, a click spawns at
   * center while a drag past the threshold spawns at the drop point.
   * Default: `false`.
   */
  clickToCreate?: boolean;

  /**
   * When `true`, pressing down on a kind button and dragging past the
   * drag threshold lets the user release over the canvas to create the
   * shape at the release point — a quick alternative to the two-step
   * "pick tool → click canvas" flow. A pure tap falls through to the
   * button's onClick, which sets the tool (or spawns at center when
   * `clickToCreate` is on).
   *
   * Default: `true`.
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
    generateId,
  } = useCasmaBoard();
  const startDrag = useShapeCreationDrag();

  // Spawn at the screen-center of the viewport. createShapeWithTool handles
  // snap-to-grid + select + tool reset.
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

  // Drag-from-button gesture. The id is generated up-front so the preview
  // shape and the eventual committed shape share it — keeps per-id
  // randomness (sticky wobble etc.) stable across the gesture.
  const onKindButtonPointerDown =
    (toolId: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      // Set the tool on pointerdown ONLY when the button is acting as a
      // tool selector. In click-to-create mode it's a one-shot spawner,
      // so we don't want a stray setTool nudge from the press.
      if (!clickToCreate) setTool(toolId);
      const kind = shapeKinds.find(
        (k) => (k.toolButton?.toolId ?? k.type) === toolId,
      );
      if (!kind) return;
      startDrag(e, {
        createInitialShape: (world) => {
          const id = generateId();
          return { kind, shape: kind.create(id, world.x, world.y) };
        },
      });
    };

  // Resolve per-mode behavior so the JSX stays clean. clickToCreate and
  // dragToCreate compose freely: both off → tap-to-set-tool; drag on →
  // gesture support added; click on → button is a one-shot spawner
  // instead of a tool selector (no active state).
  const kindButtonProps = (toolId: string) => ({
    active: clickToCreate ? false : tool === toolId,
    ariaPressed: clickToCreate ? undefined : tool === toolId,
    onClick: clickToCreate
      ? () => spawnAtViewportCenter(toolId)
      : () => setTool(toolId),
    onPointerDown: dragToCreate ? onKindButtonPointerDown(toolId) : undefined,
  });

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
