import type { Camera, StickyColor, StickyShape } from '../types';
import type { Messages } from '../i18n';
import { worldToScreen } from '../geometry/camera';
import { ColorPicker } from './ColorPicker';

interface Props {
  shape: StickyShape;
  camera: Camera;
  messages: Messages;
  onColorChange: (color: StickyColor) => void;
  onDelete: () => void;
}

const GAP_PX = 14;

/**
 * Floating context menu anchored under the selected sticky in screen space.
 * Re-rendered each frame the camera or shape moves; not in the world's 3D
 * transform context, so it stays flat and pixel-aligned regardless of tilt.
 */
export function ShapeContextMenu({
  shape,
  camera,
  messages,
  onColorChange,
  onDelete,
}: Props) {
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
      <ColorPicker
        value={shape.color}
        onChange={onColorChange}
        messages={messages}
      />
      <div className="cb-toolbar__divider" />
      <button
        type="button"
        className="cb-tool-btn cb-tool-btn--danger"
        title={messages.toolbar.delete}
        aria-label={messages.aria.deleteShape}
        onClick={onDelete}
      >
        <DeleteIcon />
      </button>
    </div>
  );
}

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
