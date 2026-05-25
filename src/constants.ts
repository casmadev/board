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

/** A single low X-axis tilt (degrees) applied to every sticky when 3D is on —
 *  subtle perspective wobble that responds to camera motion. */
export const STICKY_TILT_X_DEG = 5;
/** Maximum absolute Z-axis rotation (degrees) randomly chosen per sticky from
 *  its id so each note looks casually placed. Applies in both 2D and 3D. */
export const STICKY_Z_ROT_MAX_DEG = 2.5;
/** Default CSS perspective (px) when `depth3d` is unset. */
export const DEFAULT_DEPTH_3D = 800;
/** How far the sticky lifts (translateZ px) while being edited — animated. */
export const STICKY_EDIT_LIFT_PX = 80;
