import type { StickyColor } from '../types';
import type { Messages } from '../i18n';
import { STICKY_COLORS } from '../constants';

interface Props {
  value?: StickyColor;
  onChange: (color: StickyColor) => void;
  messages: Messages;
}

export function ColorPicker({ value, onChange, messages }: Props) {
  return (
    <div
      className="cb-color-picker"
      role="radiogroup"
      aria-label={messages.aria.colorPicker}
    >
      {STICKY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={messages.colors[color]}
          title={messages.colors[color]}
          className={`cb-color-swatch cb-color-swatch--${color}${value === color ? ' cb-color-swatch--active' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
