import type { StickyColor } from './types';

export const STICKY_COLORS: readonly StickyColor[] = [
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
] as const;

// 192 = 8 × GRID_SIZE so the sticky's right/bottom edges land on grid
// lines when snap-to-grid is on (top-left snaps; matching size keeps
// neighbors flush instead of leaving a half-cell gap).
export const DEFAULT_STICKY_SIZE = { w: 192, h: 192 };
export const DEFAULT_STICKY_COLOR: StickyColor = 'yellow';

export const STICKY_TEXT_PADDING = 14;
export const STICKY_FONT_MAX = 32;
export const STICKY_FONT_MIN = 10;

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;
export const ZOOM_WHEEL_STEP = 0.0015;

export const DRAG_THRESHOLD_PX = 4;

/** Grid cell size in world pixels. Used by the dot/line backgrounds and the
 *  optional snap-to-grid feature. */
export const GRID_SIZE = 24;

/** Maximum absolute Z-axis rotation (degrees) randomly chosen per sticky from
 *  its id so each note looks casually placed. Applies in both 2D and 3D.
 *  (The X-axis tilt is CSS-only — see --cb-sticky-tilt-x on .cb-root.) */
export const STICKY_Z_ROT_MAX_DEG = 2.5;
/** Default CSS perspective (px) when `depth3d` is unset. */
export const DEFAULT_DEPTH_3D = 800;
