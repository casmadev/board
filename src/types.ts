import type { Messages } from './i18n';

export type StickyColor =
  | 'yellow'
  | 'pink'
  | 'blue'
  | 'green'
  | 'purple';

export interface StickyShape {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: StickyColor;
}

export type Shape = StickyShape;

export interface ShapesState {
  shapes: Record<string, Shape>;
  order: string[];
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type Direction = 'ltr' | 'rtl';

export type ToolId = 'select' | 'sticky';

/** Visual style of the infinite canvas backdrop. */
export type BackgroundStyle = 'dots' | 'grid' | 'none';

/** How sticky-note text behaves when it would overflow the note bounds.
 *  - 'shrink-to-fit' (default): font shrinks until all text fits, never truncates.
 *  - 'truncate': font stays at the base size and overflowing lines are clipped
 *    with an ellipsis. */
export type TextOverflow = 'shrink-to-fit' | 'truncate';

export interface CasmaBoardProps {
  shapes?: ShapesState;
  defaultShapes?: ShapesState;
  onShapesChange?: (next: ShapesState) => void;

  camera?: Camera;
  defaultCamera?: Camera;
  onCameraChange?: (next: Camera) => void;

  messages?: DeepPartial<Messages>;
  direction?: Direction;

  hideUI?: boolean;
  className?: string;
  style?: React.CSSProperties;

  textOverflow?: TextOverflow;

  /** CSS perspective distance applied to the viewport, in pixels. Drives the
   *  3D tilt + parallax effect for sticky notes — smaller values produce a
   *  stronger perspective. Set to `0` to disable all 3D effects (stickies
   *  render flat with the slight tilt as a plain 2D rotation). Default: 800. */
  depth3d?: number;

  /** Backdrop style: a dotted pattern, a line grid, or nothing.
   *  Default: 'dots'. */
  background?: BackgroundStyle;

  /** Snap shape positions (creation + drag) to the grid. Default: false. */
  snapToGrid?: boolean;

  generateId?: () => string;
}

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type { Messages } from './i18n';
