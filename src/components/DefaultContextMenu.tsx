import type {
  ContextMenuRender,
  ContextMenuRenderProps,
  StickyColor,
  StickyShape,
} from '../types';
import { worldToScreen } from '../geometry/camera';
import { ColorPicker } from './ColorPicker';

const GAP_PX = 14;

/**
 * Default per-shape context menu. Branches on `shape.type`:
 *   - `sticky` → color picker + delete
 *   - any other type → just a delete button
 *
 * Anchored under the selected shape in screen space (not inside the world's
 * 3D transform), so it stays flat and pixel-aligned regardless of tilt.
 *
 * Override the entire surface by passing your own `contextMenu` prop on
 * `<CasmaBoard>`. Reuse the wrapper but customize buttons by copy-pasting
 * this module and editing the body.
 */
export const DefaultContextMenu: ContextMenuRender = ({
  shape,
  camera,
  messages,
  patch,
  remove,
}: ContextMenuRenderProps) => {
  const screen = worldToScreen(camera, {
    x: shape.x + shape.w / 2,
    y: shape.y + shape.h,
  });

  return (
    <div
      className="cb-context-menu"
      role="toolbar"
      style={{ left: screen.x, top: screen.y + GAP_PX }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {shape.type === 'sticky' && (
        <>
          <ColorPicker
            value={(shape as StickyShape).color}
            onChange={(color: StickyColor) =>
              patch({ color } as Partial<StickyShape>)
            }
            messages={messages}
          />
          <div className="cb-toolbar__divider" />
        </>
      )}
      <button
        type="button"
        className="cb-tool-btn cb-tool-btn--danger"
        title={messages.toolbar.delete}
        aria-label={messages.aria.deleteShape}
        onClick={remove}
      >
        <DeleteIcon />
      </button>
    </div>
  );
};

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="M4 7h16" />
      <path d="M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1z" />
      <path d="M6 7l1 12.2A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.8L18 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
