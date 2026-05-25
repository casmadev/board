import type { StickyShape } from '../types';
import type { Messages } from '../i18n';

interface Props {
  shape: StickyShape;
  selected: boolean;
  editing: boolean;
  messages: Messages;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
  onDoubleClick: () => void;
  onFocus: () => void;
}

export function StickyNote({
  shape,
  selected,
  editing,
  messages,
  pointerHandlers,
  onDoubleClick,
  onFocus,
}: Props) {
  return (
    <div
      className={`cb-sticky cb-sticky--${shape.color}${selected ? ' cb-sticky--selected' : ''}${editing ? ' cb-sticky--editing' : ''}`}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: shape.h,
      }}
      data-shape-id={shape.id}
      role="group"
      tabIndex={0}
      aria-label={`${messages.aria.sticky}${shape.text ? `: ${shape.text}` : ''}`}
      onFocus={onFocus}
      onDoubleClick={onDoubleClick}
      {...pointerHandlers}
    >
      <div className="cb-sticky__text">{shape.text}</div>
    </div>
  );
}
