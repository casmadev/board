import { useCasmaBoard } from '../context';
import type { ShapeKind, ShapeKindToolButton } from '../types';
import type { Messages } from '../i18n';

/**
 * Default bottom-of-canvas tool picker. Renders a Select button plus one
 * button per shape kind that declares a `toolButton`. Reads the board's
 * `tool` + `setTool` from context, so the same component works whether
 * you drop it in the `slots.bottomCenter` slot or somewhere outside the
 * default chrome.
 *
 * Build your own toolbar by reading `useCasmaBoard()` directly — every
 * piece of state this component uses is in the context.
 */
export function DefaultToolbar() {
  const { tool, setTool, shapeKinds, messages } = useCasmaBoard();

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
          return (
            <button
              key={toolId}
              type="button"
              className={`cb-tool-btn${tool === toolId ? ' cb-tool-btn--active' : ''}`}
              aria-pressed={tool === toolId}
              title={label}
              aria-label={label}
              onClick={() => setTool(toolId)}
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
