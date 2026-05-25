import type { Messages } from '../i18n';
import type { StickyColor, ToolId } from '../types';
import { ColorPicker } from './ColorPicker';

interface Props {
  messages: Messages;
  tool: ToolId;
  onToolChange: (next: ToolId) => void;
  selectedColor?: StickyColor;
  onSelectedColorChange?: (color: StickyColor) => void;
  canDelete: boolean;
  onDelete: () => void;
}

export function Toolbar({
  messages,
  tool,
  onToolChange,
  selectedColor,
  onSelectedColorChange,
  canDelete,
  onDelete,
}: Props) {
  return (
    <div
      className="cb-toolbar"
      role="toolbar"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="cb-toolbar__group">
        <button
          type="button"
          className={`cb-tool-btn${tool === 'select' ? ' cb-tool-btn--active' : ''}`}
          aria-pressed={tool === 'select'}
          title={messages.toolbar.select}
          aria-label={messages.toolbar.select}
          onClick={() => onToolChange('select')}
        >
          <SelectIcon />
        </button>
        <button
          type="button"
          className={`cb-tool-btn${tool === 'sticky' ? ' cb-tool-btn--active' : ''}`}
          aria-pressed={tool === 'sticky'}
          title={messages.toolbar.stickyNote}
          aria-label={messages.toolbar.stickyNote}
          onClick={() => onToolChange('sticky')}
        >
          <StickyIcon />
        </button>
      </div>

      {onSelectedColorChange && (
        <>
          <div className="cb-toolbar__divider" />
          <ColorPicker
            value={selectedColor}
            onChange={onSelectedColorChange}
            messages={messages}
          />
        </>
      )}

      {canDelete && (
        <>
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
        </>
      )}
    </div>
  );
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden focusable={false}>
      <path
        d="M4 3l11 6-4.5 1.5L9 16 4 3z"
        fill="currentColor"
      />
    </svg>
  );
}

function StickyIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden focusable={false}>
      <path
        d="M3 3h11l3 3v11H3V3z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M14 3v3h3" stroke="rgba(0,0,0,0.25)" fill="none" strokeWidth="1" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden focusable={false}>
      <path
        d="M6 6h8l-1 10H7L6 6zm2-3h4v2H8V3z"
        fill="currentColor"
      />
    </svg>
  );
}
