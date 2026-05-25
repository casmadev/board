import type { StickyColor } from './types';

export const STICKY_COLORS: readonly StickyColor[] = [
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
] as const;

export const DEFAULT_STICKY_SIZE = { w: 180, h: 180 };
export const DEFAULT_STICKY_COLOR: StickyColor = 'yellow';

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;
export const ZOOM_WHEEL_STEP = 0.0015;

export const DRAG_THRESHOLD_PX = 4;
