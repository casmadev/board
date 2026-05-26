import type {
  ComponentType,
  Dispatch,
  ReactNode,
  RefObject,
  SetStateAction,
} from 'react';
import type { Messages } from './i18n';

export type StickyColor =
  | 'yellow'
  | 'pink'
  | 'blue'
  | 'green'
  | 'purple';

/** Structural contract every shape must satisfy. Custom shape kinds declare
 *  their own interface extending `Shape` with whatever extra fields they
 *  need — no index signature required. The board itself only reads the
 *  positional fields; kind-specific data is opaque. */
export interface Shape {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Built-in sticky-note shape. */
export interface StickyShape extends Shape {
  type: 'sticky';
  text: string;
  color: StickyColor;
}

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

/** Tool id selected in the toolbar. `'select'` is reserved for pointer-only
 *  mode; every other id corresponds to a shape kind's tool button. */
export type ToolId = 'select' | (string & {});

/** Visual style of the infinite canvas backdrop. */
export type BackgroundStyle = 'dots' | 'grid' | 'none';

/** How sticky-note text behaves when it would overflow the note bounds.
 *  - 'shrink-to-fit' (default): font shrinks until all text fits, never truncates.
 *  - 'truncate': font stays at the base size and overflowing lines are clipped
 *    with an ellipsis. */
export type TextOverflow = 'shrink-to-fit' | 'truncate';

/* ------------------------------------------------------------------ */
/* Pluggable shape kinds                                              */
/* ------------------------------------------------------------------ */

/** Pointer handlers wired into a shape so the board can drive selection +
 *  drag. The kind's render component spreads these onto its root element. */
export interface PointerHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

/** Everything a shape kind's render component receives. */
export interface ShapeRenderProps<S extends Shape = Shape> {
  shape: S;
  selected: boolean;
  editing: boolean;
  /** Bumped each time editing ends — kinds can mix this into per-shape
   *  randomization (e.g. sticky's wobble reroll) so the visual "settles"
   *  differently after every edit. */
  editVersion: number;
  depth3d: number;
  textOverflow: TextOverflow;
  messages: Messages;
  pointerHandlers: PointerHandlers;
  /** Pre-composed `cb-shape` class plus any active state modifiers
   *  (`cb-shape--selected`, `cb-shape--editing`, `cb-shape--dragging`).
   *  Spread onto the renderer's root element to opt into the shared
   *  cursor / selection-ring / drag-state styling. Renderers may compose
   *  their own classes alongside. */
  className: string;
  /** Move this shape into the selected set. */
  onSelect: () => void;
  /** Enter edit mode for this shape. */
  onStartEdit: () => void;
  /** Exit edit mode and bump editVersion. Call patch first if you need to
   *  persist the edit's data. */
  onCommitEdit: () => void;
  /** Exit edit mode without keeping changes. Still bumps editVersion so the
   *  kind can re-run any "settle" animation. */
  onCancelEdit: () => void;
  /** Patch this shape's data. Safe to call any time, not only during edit. */
  patch: (next: Partial<S>) => void;
}

/** Toolbar button registered by a shape kind. Rendered by `DefaultToolbar`. */
export interface ShapeKindToolButton {
  /** Tool id activated when this button is clicked. Defaults to the kind's
   *  `type`. Custom kinds can pick a different id to register multiple tools
   *  per kind (e.g. arrow-line vs arrow-curve). */
  toolId?: string;
  /** Icon element. Receives no props — give it a stable size (~18px). */
  icon: ReactNode;
  /** Tooltip / aria-label. Either a static string or a function of the
   *  current `Messages` (so consumers can localize without forking). */
  label: string | ((messages: Messages) => string);
}

/** Definition of a shape type that the board knows how to render and create.
 *  Pass an array of these via the `shapeKinds` prop to extend the board with
 *  custom shapes. `defaultShapeKinds` ships the sticky. */
export interface ShapeKind<S extends Shape = Shape> {
  /** Matched against `shape.type` to route render + factory. */
  type: S['type'];
  /** Used by `create` and hit-testing as a sensible starting size. */
  defaultSize?: { w: number; h: number };
  /** Factory invoked when this kind's tool is active and the user clicks the
   *  canvas. `x, y` are world coordinates of the click. */
  create: (id: string, x: number, y: number) => S;
  /** Component that renders one instance of this shape. */
  Component: ComponentType<ShapeRenderProps<S>>;
  /** When set, `DefaultToolbar` renders a button activating this kind's tool. */
  toolButton?: ShapeKindToolButton;
}

/* ------------------------------------------------------------------ */
/* Slots + context menu                                               */
/* ------------------------------------------------------------------ */

/** Fixed overlays positioned over the viewport. Each slot is a transparent
 *  wrapper anchored to its corner/edge; only its children capture pointer
 *  events. Use these for chrome like custom toolbars, zoom controls,
 *  titles, etc. The board's default toolbar lives in `bottomCenter`. */
export interface Slots {
  topLeft?: ReactNode;
  topCenter?: ReactNode;
  topRight?: ReactNode;
  /** Centered both horizontally and vertically over the viewport. When
   *  omitted, the board renders its default empty-state hint (which itself
   *  self-suppresses once any shapes exist). Pass `null` to disable. */
  center?: ReactNode;
  bottomLeft?: ReactNode;
  bottomCenter?: ReactNode;
  bottomRight?: ReactNode;
}

export interface ContextMenuRenderProps {
  shape: Shape;
  camera: Camera;
  messages: Messages;
  /** Patch the selected shape. */
  patch: (next: Partial<Shape>) => void;
  /** Delete the selected shape. */
  remove: () => void;
}

/** Render function for the per-shape context menu. Receives the currently
 *  selected shape + helpers; returns whatever JSX you like. The default
 *  implementation (`DefaultContextMenu`) ships a color picker + delete for
 *  sticky shapes. */
export type ContextMenuRender = (props: ContextMenuRenderProps) => ReactNode;

/* ------------------------------------------------------------------ */
/* Board context — for custom slot content to drive the board         */
/* ------------------------------------------------------------------ */

export interface BoardContextValue {
  tool: ToolId;
  setTool: (next: ToolId) => void;
  camera: Camera;
  setCamera: Dispatch<SetStateAction<Camera>>;
  shapes: ShapesState;
  setShapes: Dispatch<SetStateAction<ShapesState>>;
  /** Array uses `ShapeKind<any>` because Component is contravariant in its
   *  shape generic — a `ShapeKind<StickyShape>` isn't assignable to
   *  `ShapeKind<Shape>` and we want consumers to mix kinds without casts. */
  shapeKinds: ShapeKind<any>[];
  messages: Messages;
  direction: Direction;
  selectedId: string | null;
  selectedShape: Shape | undefined;
  setSelectedId: (id: string | null) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  /** Patch a shape by id. */
  patchShape: (id: string, next: Partial<Shape>) => void;
  /** Delete a shape by id. */
  removeShape: (id: string) => void;
  /** Add a shape to the board. */
  addShape: (shape: Shape) => void;
  /** Create a shape at the given world point using a registered tool id.
   *  Runs the same path the viewport click takes: looks up the kind via
   *  `shapeKinds`, calls `kind.create`, applies snap-to-grid, adds and
   *  selects the shape, and resets the tool to `'select'`. Returns the
   *  created shape, or `null` if `toolId` doesn't map to any kind.
   *
   *  Useful for drag-from-toolbar gestures or other ad-hoc creation UI. */
  createShapeWithTool: (
    toolId: string,
    world: { x: number; y: number },
  ) => Shape | null;
  /** Generator the board uses for new shape ids — exposed so custom UI
   *  (e.g. a drag-from-toolbar preview) can mint an id at gesture start
   *  and reuse it on commit, keeping any per-id randomness (sticky wobble
   *  etc.) stable between preview and final shape. */
  generateId: () => string;
  /** Whether the board's `snapToGrid` prop is on. Read-only mirror so
   *  consumer UI can apply the same snap to ad-hoc creation paths. */
  snapToGrid: boolean;
  /** Ephemeral shape rendered inside the world at 40% opacity (via the
   *  `cb-shape--preview` class) while a drag-from-toolbar gesture is in
   *  flight. Set via `setDragPreview`; the board reads this and renders
   *  it after the real shapes so it sits visually on top. */
  dragPreview: { kind: ShapeKind<any>; shape: Shape } | null;
  setDragPreview: (
    preview: { kind: ShapeKind<any>; shape: Shape } | null,
  ) => void;
  /** Element backing the clipped viewport — handy for measuring before
   *  positioning custom overlays. */
  viewportRef: RefObject<HTMLDivElement>;
}

/* ------------------------------------------------------------------ */
/* Top-level component props                                          */
/* ------------------------------------------------------------------ */

export interface CasmaBoardProps {
  shapes?: ShapesState;
  defaultShapes?: ShapesState;
  onShapesChange?: (next: ShapesState) => void;

  camera?: Camera;
  defaultCamera?: Camera;
  onCameraChange?: (next: Camera) => void;

  messages?: DeepPartial<Messages>;
  direction?: Direction;

  /** Suppress every default UI surface (the slot bag, the default toolbar in
   *  bottomCenter, the per-shape context menu). Use this when you're building
   *  the whole chrome yourself in slots or outside the board. */
  hideUI?: boolean;
  className?: string;
  style?: React.CSSProperties;

  textOverflow?: TextOverflow;

  /** CSS perspective distance applied to the viewport, in pixels. Drives the
   *  3D tilt + parallax effect for sticky notes — smaller values produce a
   *  stronger perspective. Set to `0` to disable all 3D effects. Default: 800. */
  depth3d?: number;

  /** Backdrop style: a dotted pattern, a line grid, or nothing. Default: 'dots'. */
  background?: BackgroundStyle;

  /** Snap shape positions (creation + drag) to the grid. Default: false. */
  snapToGrid?: boolean;

  generateId?: () => string;

  /* ---- Customization ---- */

  /** Shape kinds the board knows how to render and create. Default:
   *  `defaultShapeKinds` (sticky only). Spread to extend:
   *  `shapeKinds={[...defaultShapeKinds, myArrowKind]}`. Uses `ShapeKind<any>`
   *  so kinds with different shape generics can sit in the same array. */
  shapeKinds?: ShapeKind<any>[];

  /** Initial tool. Defaults to 'select'. Must match a kind's `toolButton.toolId`
   *  (or its `type`) if not 'select'. */
  defaultTool?: ToolId;

  /** Six overlay slots anchored over the viewport. Each accepts any
   *  ReactNode. When `bottomCenter` is omitted (and `hideUI` is false), the
   *  board renders `DefaultToolbar` there. */
  slots?: Slots;

  /** Render function for the per-shape context menu. Receives the selected
   *  shape and helpers. Default: `DefaultContextMenu`. */
  contextMenu?: ContextMenuRender;
}

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type { Messages } from './i18n';
