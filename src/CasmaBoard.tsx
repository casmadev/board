import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  BoardContextValue,
  CasmaBoardProps,
  ContextMenuRender,
  Shape,
  ShapeCallbacks,
  ShapeKind,
  Slots,
  ToolId,
} from './types';
// Internal alias so we don't sprinkle `ShapeKind<any>` everywhere — kinds in
// a heterogeneous array must be `any`-typed for variance reasons.
type AnyShapeKind = ShapeKind<any>;
import { BoardContext } from './context';
import { useShapes } from './hooks/useShapes';
import { useCamera } from './hooks/useCamera';
import { useMessages } from './hooks/useMessages';
import { usePanZoom } from './hooks/usePanZoom';
import { useDragShape } from './hooks/useDragShape';
import {
  addShape,
  deleteShape,
  updateShape,
} from './state/reducer';
import { getOrderedShapes } from './state/selectors';
import { screenToWorld } from './geometry/camera';
import { World } from './components/World';
import { DefaultToolbar } from './components/DefaultToolbar';
import { DefaultContextMenu } from './components/DefaultContextMenu';
import { DefaultEmptyHint } from './components/DefaultEmptyHint';
import { DefaultZoomWidget } from './components/DefaultZoomWidget';
import { SlotOverlays } from './components/Slots';
import { defaultShapeKinds } from './kinds';
import { DEFAULT_DEPTH_3D, GRID_SIZE } from './constants';

const fallbackId = (() => {
  let n = 0;
  return () => `cb-${Date.now().toString(36)}-${(n++).toString(36)}`;
})();

const defaultIdGen = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return fallbackId();
};

const noop = () => {};
// Drop-in pointer handlers for the drag-preview render — the preview must
// be visible but inert so it can't accidentally start its own drag/select.
const INERT_POINTER_HANDLERS = {
  onPointerDown: noop,
  onPointerMove: noop,
  onPointerUp: noop,
  onPointerCancel: noop,
};

export function CasmaBoard(props: CasmaBoardProps) {
  const {
    shapes: shapesProp,
    defaultShapes,
    onShapesChange,
    camera: cameraProp,
    defaultCamera,
    onCameraChange,
    messages: messagesOverride,
    direction = 'ltr',
    hideUI = false,
    className,
    style,
    textOverflow = 'shrink-to-fit',
    depth3d = DEFAULT_DEPTH_3D,
    background = 'dots',
    snapToGrid = false,
    generateId = defaultIdGen,
    shapeKinds: shapeKindsProp,
    defaultTool = 'select',
    doubleClickSpawn = 'sticky',
    slots,
    contextMenu,
    onShapeAdd,
    onShapeRemove,
    onShapePatch,
    onShapeSelect,
    onShapeDeselect,
    onShapeEditStart,
    onShapeEditCommit,
    onShapeEditCancel,
    onShapeDragStart,
    onShapeDragMove,
    onShapeDragEnd,
  } = props;

  // Stash callbacks in a ref so the closures below stay stable across renders
  // (don't want to rebuild `dragHandlersFactory` or other useCallbacks every
  // time a parent re-renders with a fresh inline lambda).
  const callbacksRef = useRef<ShapeCallbacks>({});
  callbacksRef.current = {
    onShapeAdd,
    onShapeRemove,
    onShapePatch,
    onShapeSelect,
    onShapeDeselect,
    onShapeEditStart,
    onShapeEditCommit,
    onShapeEditCancel,
    onShapeDragStart,
    onShapeDragMove,
    onShapeDragEnd,
  };

  // Default to the sticky-only set when the consumer doesn't pass shapeKinds.
  // This is what makes `<CasmaBoard />` "just work" out of the box.
  const shapeKinds = shapeKindsProp ?? defaultShapeKinds;

  // tool id → kind, for click-to-create routing. A kind's `toolButton.toolId`
  // overrides its `type` so multiple tools-per-kind stay possible.
  const toolKindMap = useMemo(() => {
    const m = new Map<string, AnyShapeKind>();
    for (const k of shapeKinds) {
      const id = k.toolButton?.toolId ?? k.type;
      m.set(id, k);
    }
    return m;
  }, [shapeKinds]);

  // shape.type → kind, for rendering.
  const kindByType = useMemo(() => {
    const m = new Map<string, AnyShapeKind>();
    for (const k of shapeKinds) m.set(k.type, k);
    return m;
  }, [shapeKinds]);

  const snap = useCallback(
    (n: number) => (snapToGrid ? Math.round(n / GRID_SIZE) * GRID_SIZE : n),
    [snapToGrid],
  );

  const [shapesState, setShapesState] = useShapes(
    shapesProp,
    defaultShapes,
    onShapesChange,
  );
  const [camera, setCamera] = useCamera(cameraProp, defaultCamera, onCameraChange);
  const messages = useMessages(messagesOverride);

  const [tool, setTool] = useState<ToolId>(defaultTool);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Id of the shape currently past the drag threshold, if any. Drives the
  // `cb-shape--dragging` modifier so cursor / styling can respond uniformly.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Live preview shape rendered inside .cb-world during a drag-from-toolbar
  // gesture. Owned by the board (so it can render in the world's transform
  // context); driven by the toolbar via setDragPreview on the context.
  const [dragPreview, setDragPreview] = useState<
    { kind: ShapeKind<any>; shape: Shape } | null
  >(null);
  // Per-shape version counter — bumped each time editing ends. Renderers can
  // mix this into their hash so wobble/etc rerolls every time the user
  // "puts the shape back".
  const [editVersions, setEditVersions] = useState<Record<string, number>>({});

  // Internal end-of-edit. Stays silent on callbacks — the *kind* decides
  // commit vs cancel via the wrapped onCommitEdit/onCancelEdit props
  // (below). Click-outside / global-Escape paths call this directly and
  // let the kind's cleanup effect (e.g. sticky's "commit dirty draft on
  // unmount") drive the user-facing callback.
  const endEdit = useCallback((id: string | null) => {
    setEditingId(null);
    if (id) {
      setEditVersions((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
    }
  }, []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  // Latest shapes state — read by callbacks that need the freshest shape
  // (e.g. firing `onShapeDragMove` with the post-patch position, or
  // `onShapeEditCommit` with the post-edit text). Updated below at render
  // time after `shapesState` is destructured from `useShapes`.
  const shapesStateRef = useRef(shapesState);
  shapesStateRef.current = shapesState;
  // Per-id post-patch snapshot, updated synchronously inside patchShape's
  // reducer. Callbacks (drag move/end, edit commit) read from this *first*
  // because `shapesStateRef` is only refreshed on render — and React may
  // not have rendered between a pointermove patch and the immediately-
  // following pointerup. Falls back to shapesStateRef for shapes that
  // haven't been patched in this lifecycle (e.g. drag-start: position
  // hasn't changed yet).
  const latestShapesRef = useRef<Record<string, Shape>>({});
  const readShape = useCallback((id: string): Shape | undefined => {
    return latestShapesRef.current[id] ?? shapesStateRef.current.shapes[id];
  }, []);

  // Run a mutation-callback and fold its return into a patch. Returns the
  // patch the board should commit (`base` plus any override from the
  // consumer). The proposed merged shape is built once and passed to the
  // callback so it sees the "would-be-committed" view. The override happens
  // before any state mutation, so the entire change lands in a single
  // setShapesState — no flash.
  type MutationCb<R> = ((shape: Shape) => R) | undefined;
  const applyMutationCallback = useCallback(
    (
      prev: Shape,
      base: Partial<Shape>,
      cb: MutationCb<Partial<Shape> | void>,
    ): { patch: Partial<Shape>; merged: Shape } => {
      const proposed = { ...prev, ...base } as Shape;
      const override = cb?.(proposed);
      if (override && Object.keys(override).length > 0) {
        return {
          patch: { ...base, ...override },
          merged: { ...proposed, ...override } as Shape,
        };
      }
      return { patch: base, merged: proposed };
    },
    [],
  );

  const panZoom = usePanZoom({ viewportRef, camera, setCamera });

  // Mirrors selectedId outside the React state so `select` can compare the
  // incoming id against the live previous one without re-entrant
  // setSelectedId calls (which would fire callbacks twice under StrictMode).
  const selectedIdRef = useRef<string | null>(null);
  const select = useCallback(
    (id: string | null) => {
      const prev = selectedIdRef.current;
      if (prev !== id) {
        selectedIdRef.current = id;
        setSelectedId(id);
        // Fire onShapeDeselect for the previously-selected shape when the
        // selection moves elsewhere (or is cleared).
        if (prev !== null) {
          const prevShape = readShape(prev);
          // prevShape can be undefined if the shape was just removed —
          // `removeShape` handles the remove callback itself, so just skip
          // deselect in that case.
          if (prevShape) callbacksRef.current.onShapeDeselect?.(prevShape);
        }
        if (id !== null) {
          const newShape = readShape(id);
          if (newShape) callbacksRef.current.onShapeSelect?.(newShape);
        }
      }
      // Note: we deliberately do NOT reorder shapes here. Reordering would
      // move the DOM node via insertBefore, which can release the active
      // pointer capture and abort an in-progress drag. The selected shape is
      // brought visually on top via CSS z-index instead.
    },
    [readShape],
  );

  // Shape mutators wired once and reused by both the per-shape renderer and
  // the BoardContext exposed to slot content. `setShapesState` is a callable
  // ref-backed setter, so closure freshness isn't an issue.
  const patchShape = useCallback(
    (id: string, next: Partial<Shape>) => {
      const prev = readShape(id);
      if (!prev) return;
      // Fire onShapePatch first and let it override fields — folding the
      // consumer's return into the same setShapesState below keeps the
      // mutation single-render. The patchShape contract guarantees the
      // committed shape is what the callback returned (if it returned
      // anything), not just what the caller asked for.
      const { patch, merged } = applyMutationCallback(prev, next, (s) =>
        callbacksRef.current.onShapePatch?.(s, next),
      );
      latestShapesRef.current[id] = merged;
      setShapesState((s) => updateShape(s, id, patch));
    },
    [setShapesState, readShape, applyMutationCallback],
  );

  const removeShape = useCallback(
    (id: string) => {
      // Snapshot before deletion so the callback can read the final state.
      const removed = readShape(id);
      setShapesState((s) => deleteShape(s, id));
      delete latestShapesRef.current[id];
      // If the deleted shape was the selection, clear it — otherwise the
      // context menu would point at a missing shape next render. Drop the
      // selectedIdRef + state directly (not through `select`) so
      // onShapeDeselect doesn't fire alongside onShapeRemove; the consumer
      // correlates the two via onShapeRemove alone.
      if (selectedIdRef.current === id) {
        selectedIdRef.current = null;
        setSelectedId(null);
      }
      if (removed) callbacksRef.current.onShapeRemove?.(removed);
    },
    [setShapesState, readShape],
  );

  const addShapeFn = useCallback(
    (shape: Shape) => {
      // Let onShapeAdd override fields *before* the shape lands in state —
      // again, one setShapesState call, no transitional render.
      const override = callbacksRef.current.onShapeAdd?.(shape);
      const final =
        override && Object.keys(override).length > 0
          ? ({ ...shape, ...override } as Shape)
          : shape;
      setShapesState((s) => addShape(s, final));
      latestShapesRef.current[final.id] = final;
    },
    [setShapesState],
  );

  const dragHandlersFactory = useDragShape({
    cameraRef,
    onSelect: select,
    onMove: (id, x, y) => {
      const prev = readShape(id);
      if (!prev) return;
      // Drag callback fires *first* with the proposed snapped position so
      // the consumer can clamp / replace it inline. The folded override is
      // threaded into the patch, then patchShape applies it (still calling
      // onShapePatch with the post-drag-clamp shape, so two transform
      // points stack cleanly).
      const baseDiff = { x: snap(x), y: snap(y) } as Partial<Shape>;
      const { patch } = applyMutationCallback(prev, baseDiff, (s) =>
        callbacksRef.current.onShapeDragMove?.(s),
      );
      patchShape(id, patch);
    },
    onDragChange: (id, isDragging) => {
      setDraggingId(isDragging ? id : null);
      const prev = readShape(id);
      if (!prev) return;
      // Drag start/end can transform too (e.g. "lift" visual via a tilt
      // patch). Empty base patch — the callback is the *only* source of
      // mutation here. When the consumer returns nothing, we skip the
      // setShapesState entirely and just fire the event side-effects.
      const cb = isDragging
        ? callbacksRef.current.onShapeDragStart
        : callbacksRef.current.onShapeDragEnd;
      const override = cb?.(prev);
      if (override && Object.keys(override).length > 0) {
        patchShape(id, override);
      }
    },
  });

  // Single creation path used by both the viewport click and the toolbar's
  // drag-out-onto-canvas gesture. Returns the created shape (or null when
  // the toolId doesn't map to any kind) so callers can branch on success.
  const createShapeWithTool = useCallback(
    (toolId: string, world: { x: number; y: number }): Shape | null => {
      const kind = toolKindMap.get(toolId);
      if (!kind) return null;
      const created = kind.create(generateId(), world.x, world.y);
      if (snapToGrid) {
        created.x = snap(created.x);
        created.y = snap(created.y);
      }
      addShapeFn(created);
      select(created.id);
      setTool('select');
      return created;
    },
    [toolKindMap, generateId, snapToGrid, snap, addShapeFn, select],
  );

  // Double-click on empty canvas: spawn the configured default shape kind
  // (by `type`, not toolId — that's what consumers think of). Snap-to-grid
  // is applied the same way as the single-click creation path. Skipped
  // when a non-select tool is active (the first click already created a
  // shape — dropping another on the dblclick would be surprising) and
  // when the click happens on an existing shape (the shape's own dblclick
  // handler takes over, e.g. sticky's enter-edit).
  const handleViewportDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (doubleClickSpawn === false) return;
      if (tool !== 'select') return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-shape-id]')) return;
      const kind = kindByType.get(doubleClickSpawn);
      if (!kind) return; // type not registered — silently no-op
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const world = screenToWorld(cameraRef.current, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      const created = kind.create(generateId(), world.x, world.y);
      if (snapToGrid) {
        created.x = snap(created.x);
        created.y = snap(created.y);
      }
      addShapeFn(created);
      select(created.id);
    },
    [
      doubleClickSpawn,
      tool,
      kindByType,
      generateId,
      snapToGrid,
      snap,
      addShapeFn,
      select,
    ],
  );

  // Click on empty viewport: create a shape (for any non-select tool) or
  // deselect (for select). Custom shape kinds get the click for free because
  // we route through `toolKindMap`.
  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Let pan handler claim middle-button / space-pan first
      panZoom.onPointerDown(e);
      if (panZoom.isPanning()) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('[data-shape-id]')) return; // shape will handle

      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const world = screenToWorld(cameraRef.current, screen);

      if (tool !== 'select') {
        const created = createShapeWithTool(tool, world);
        if (created) return;
        // Unknown tool id — fall through to deselect. (A consumer might set
        // a tool string that doesn't map to any kind; degrading gracefully
        // beats throwing.)
      }
      select(null);
      endEdit(editingId);
    },
    [
      panZoom,
      tool,
      createShapeWithTool,
      select,
      endEdit,
      editingId,
    ],
  );

  // Keyboard: delete selected shape, escape to deselect / leave edit.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        endEdit(editingId);
        select(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        removeShape(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, editingId, removeShape, endEdit, select]);

  const ordered = useMemo(() => getOrderedShapes(shapesState), [shapesState]);
  const selectedShape: Shape | undefined =
    selectedId !== null ? shapesState.shapes[selectedId] : undefined;

  // Build the BoardContext value. Memoized so identity-stable consumers
  // (custom slot components that useMemo on parts of it) don't re-render on
  // every shape mutation needlessly. The whole value still changes whenever
  // any field does — that's intentional; React.memo at the consumer is the
  // right place to do finer-grained skipping.
  const ctx: BoardContextValue = useMemo(
    () => ({
      tool,
      setTool,
      camera,
      setCamera,
      shapes: shapesState,
      setShapes: setShapesState,
      shapeKinds,
      messages,
      direction,
      selectedId,
      selectedShape,
      setSelectedId: select,
      editingId,
      setEditingId,
      patchShape,
      removeShape,
      addShape: addShapeFn,
      createShapeWithTool,
      generateId,
      snapToGrid,
      dragPreview,
      setDragPreview,
      viewportRef,
    }),
    [
      tool,
      camera,
      setCamera,
      shapesState,
      setShapesState,
      shapeKinds,
      messages,
      direction,
      selectedId,
      selectedShape,
      select,
      editingId,
      patchShape,
      removeShape,
      addShapeFn,
      createShapeWithTool,
      generateId,
      snapToGrid,
      dragPreview,
    ],
  );

  // Resolve slot content. Each defaulted slot follows the same convention:
  // omit the key → default is rendered, pass `null` → slot is suppressed,
  // pass any value → that value is rendered. `hideUI` short-circuits all
  // defaults (and discards consumer slot content too).
  const resolvedSlots: Slots = useMemo(() => {
    if (hideUI) return {};
    const provided = slots ?? {};
    const out: Slots = { ...provided };
    if (!('bottomCenter' in provided)) {
      out.bottomCenter = <DefaultToolbar />;
    }
    if (!('bottomRight' in provided)) {
      out.bottomRight = <DefaultZoomWidget />;
    }
    if (!('center' in provided)) {
      out.center = <DefaultEmptyHint />;
    }
    return out;
  }, [slots, hideUI]);

  const renderContextMenu: ContextMenuRender = contextMenu ?? DefaultContextMenu;

  const cursorMode =
    tool !== 'select'
      ? 'cb-root--cursor-add'
      : panZoom.isSpaceHeld()
        ? 'cb-root--cursor-grab'
        : '';

  return (
    <BoardContext.Provider value={ctx}>
      <div
        className={`cb-root ${cursorMode}${className ? ` ${className}` : ''}`}
        style={style}
        dir={direction}
        role="application"
        aria-label={messages.aria.canvas}
        data-tool={tool}
      >
        <div
          ref={viewportRef}
          className={`cb-viewport cb-viewport--bg-${background}`}
          style={{
            ...(depth3d > 0 ? { perspective: `${depth3d}px` } : null),
            ...(background !== 'none'
              ? {
                  backgroundSize: `${GRID_SIZE * camera.zoom}px ${GRID_SIZE * camera.zoom}px`,
                  backgroundPosition: `${camera.x}px ${camera.y}px`,
                }
              : null),
          }}
          onPointerDown={handleViewportPointerDown}
          onDoubleClick={handleViewportDoubleClick}
          onPointerMove={panZoom.onPointerMove}
          onPointerUp={panZoom.onPointerUp}
          onPointerCancel={panZoom.onPointerCancel}
        >
          <World camera={camera}>
            {ordered.map((shape) => {
              const kind = kindByType.get(shape.type);
              if (!kind) return null; // unknown shape type — skip silently
              const Component = kind.Component;
              const isDisabled = shape.disabled === true;
              // Disabled shapes are visible but inert: no drag/select/edit
              // wiring, so the renderer receives no-op handlers and the
              // viewport click never starts a gesture on them. The
              // cb-shape--disabled class lets CSS opt into a different
              // cursor / locked visual.
              const handlers = isDisabled
                ? INERT_POINTER_HANDLERS
                : dragHandlersFactory(shape.id, shape.x, shape.y);
              const isSelected = !isDisabled && selectedId === shape.id;
              const isEditing = !isDisabled && editingId === shape.id;
              const isDragging = !isDisabled && draggingId === shape.id;
              // Pre-composed shape class. Renderers spread this on their root
              // to opt into `cb-shape` baseline (position, cursor, transition)
              // plus state modifiers (selection ring, z-lift, grabbing cursor).
              const className =
                'cb-shape' +
                (isSelected ? ' cb-shape--selected' : '') +
                (isEditing ? ' cb-shape--editing' : '') +
                (isDragging ? ' cb-shape--dragging' : '') +
                (isDisabled ? ' cb-shape--disabled' : '');
              return (
                <Component
                  key={shape.id}
                  shape={shape}
                  selected={isSelected}
                  editing={isEditing}
                  editVersion={editVersions[shape.id] ?? 0}
                  textOverflow={textOverflow}
                  depth3d={depth3d}
                  messages={messages}
                  pointerHandlers={handlers}
                  className={className}
                  onSelect={isDisabled ? noop : () => select(shape.id)}
                  onStartEdit={
                    isDisabled
                      ? noop
                      : () => {
                          setEditingId(shape.id);
                          const fresh = readShape(shape.id);
                          if (!fresh) return;
                          const override =
                            callbacksRef.current.onShapeEditStart?.(fresh);
                          if (override && Object.keys(override).length > 0) {
                            patchShape(shape.id, override);
                          }
                        }
                  }
                  onCommitEdit={
                    isDisabled
                      ? noop
                      : () => {
                          endEdit(shape.id);
                          // Sticky calls patch() right before onCommitEdit, so
                          // readShape returns the post-edit text already.
                          const fresh = readShape(shape.id);
                          if (!fresh) return;
                          const override =
                            callbacksRef.current.onShapeEditCommit?.(fresh);
                          if (override && Object.keys(override).length > 0) {
                            patchShape(shape.id, override);
                          }
                        }
                  }
                  onCancelEdit={
                    isDisabled
                      ? noop
                      : () => {
                          endEdit(shape.id);
                          const fresh = readShape(shape.id);
                          if (!fresh) return;
                          const override =
                            callbacksRef.current.onShapeEditCancel?.(fresh);
                          if (override && Object.keys(override).length > 0) {
                            patchShape(shape.id, override);
                          }
                        }
                  }
                  patch={(next) => patchShape(shape.id, next)}
                />
              );
            })}
            {dragPreview && (() => {
              // Render the preview using the kind's own component so it
              // matches the real shape pixel-for-pixel — wobble, tilt, the
              // pseudo-shadow, everything. Inert handlers + the
              // `cb-shape--preview` modifier (opacity 0.4 + pointer-events
              // none) keep it from interfering with the in-flight gesture.
              const C = dragPreview.kind.Component;
              return (
                <C
                  shape={dragPreview.shape}
                  selected={false}
                  editing={false}
                  editVersion={0}
                  textOverflow={textOverflow}
                  depth3d={depth3d}
                  messages={messages}
                  pointerHandlers={INERT_POINTER_HANDLERS}
                  className="cb-shape cb-shape--preview"
                  onSelect={noop}
                  onStartEdit={noop}
                  onCommitEdit={noop}
                  onCancelEdit={noop}
                  patch={noop}
                />
              );
            })()}
          </World>
        </div>

        <SlotOverlays slots={resolvedSlots} />

        {/*
          Context menu lives at the .cb-root level (sibling of the
          viewport, after the slot row) so it can paint above the slot
          chrome. Rendered inside the viewport it'd be trapped in the
          viewport's stacking context (created by overflow: hidden) and
          no z-index could lift it above .cb-slot. The menu uses
          worldToScreen against the same camera the viewport does, and
          .cb-root fills the same area as .cb-viewport, so the absolute
          positioning math is unchanged.
        */}
        {!hideUI &&
          selectedShape &&
          !selectedShape.disabled &&
          editingId !== selectedShape.id &&
          renderContextMenu({
            shape: selectedShape,
            camera,
            messages,
            patch: (next) => patchShape(selectedShape.id, next),
            remove: () => removeShape(selectedShape.id),
          })}
      </div>
    </BoardContext.Provider>
  );
}

