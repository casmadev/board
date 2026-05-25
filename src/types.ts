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

  generateId?: () => string;
}

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type { Messages } from './i18n';
