export { CasmaBoard } from './CasmaBoard';

// Default UI surfaces. Use these directly if you want to compose your own
// layout (drop them into custom slots, render outside the board, etc.).
export { DefaultToolbar } from './components/DefaultToolbar';
export { DefaultContextMenu } from './components/DefaultContextMenu';
export { DefaultEmptyHint } from './components/DefaultEmptyHint';
export { DefaultZoomWidget } from './components/DefaultZoomWidget';
export { ColorPicker } from './components/ColorPicker';

// Shape kinds. `defaultShapeKinds` is the sticky-only set the component
// uses when `shapeKinds` is not provided.
export { defaultShapeKinds, stickyKind, StickyNote, StickyIcon } from './kinds';

// Context — for custom slot UI to read live board state.
export { BoardContext, useCasmaBoard } from './context';

// Constants the average consumer is likely to need.
export {
  STICKY_COLORS,
  DEFAULT_STICKY_COLOR,
  DEFAULT_STICKY_SIZE,
  ZOOM_MIN,
  ZOOM_MAX,
  GRID_SIZE,
} from './constants';

// State helpers — for consumers driving the board in controlled mode.
export {
  emptyShapes,
  createStickyShape,
  addShape,
  updateShape,
  deleteShape,
} from './state/reducer';

// Geometry helpers — useful when positioning custom overlays in slot content.
export {
  screenToWorld,
  worldToScreen,
  clampZoom,
  zoomAtPoint,
} from './geometry/camera';

// i18n
export { defaultMessages, mergeMessages } from './i18n';

// Types
export type { Messages } from './i18n';
export type {
  BackgroundStyle,
  BoardContextValue,
  CasmaBoardProps,
  Camera,
  ContextMenuRender,
  ContextMenuRenderProps,
  Direction,
  PointerHandlers,
  Shape,
  ShapeKind,
  ShapeKindToolButton,
  ShapeRenderProps,
  ShapesState,
  Slots,
  StickyColor,
  StickyShape,
  TextOverflow,
  ToolId,
} from './types';
