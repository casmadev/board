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
    slots,
    contextMenu,
  } = props;

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
  // Per-shape version counter — bumped each time editing ends. Renderers can
  // mix this into their hash so wobble/etc rerolls every time the user
  // "puts the shape back".
  const [editVersions, setEditVersions] = useState<Record<string, number>>({});

  const endEdit = useCallback((id: string | null) => {
    setEditingId(null);
    if (id) {
      setEditVersions((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
    }
  }, []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const panZoom = usePanZoom({ viewportRef, camera, setCamera });

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    // Note: we deliberately do NOT reorder shapes here. Reordering would
    // move the DOM node via insertBefore, which can release the active
    // pointer capture and abort an in-progress drag. The selected shape is
    // brought visually on top via CSS z-index instead.
  }, []);

  // Shape mutators wired once and reused by both the per-shape renderer and
  // the BoardContext exposed to slot content. `setShapesState` is a callable
  // ref-backed setter, so closure freshness isn't an issue.
  const patchShape = useCallback(
    (id: string, next: Partial<Shape>) => {
      setShapesState((s) => updateShape(s, id, next));
    },
    [setShapesState],
  );

  const removeShape = useCallback(
    (id: string) => {
      setShapesState((s) => deleteShape(s, id));
      // If the deleted shape was the selection, clear it — otherwise the
      // context menu would point at a missing shape next render.
      setSelectedId((sel) => (sel === id ? null : sel));
    },
    [setShapesState],
  );

  const addShapeFn = useCallback(
    (shape: Shape) => {
      setShapesState((s) => addShape(s, shape));
    },
    [setShapesState],
  );

  const dragHandlersFactory = useDragShape({
    cameraRef,
    onSelect: select,
    onMove: (id, x, y) => patchShape(id, { x: snap(x), y: snap(y) }),
    onDragChange: (id, isDragging) => setDraggingId(isDragging ? id : null),
  });

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
        const kind = toolKindMap.get(tool);
        if (!kind) {
          // Unknown tool id — treat as deselect. (A consumer might set a tool
          // string that doesn't map to any kind; degrading gracefully beats
          // throwing.)
          select(null);
          endEdit(editingId);
          return;
        }
        const created = kind.create(generateId(), world.x, world.y);
        if (snapToGrid) {
          created.x = snap(created.x);
          created.y = snap(created.y);
        }
        addShapeFn(created);
        select(created.id);
        setTool('select');
      } else {
        select(null);
        endEdit(editingId);
      }
    },
    [
      panZoom,
      tool,
      toolKindMap,
      generateId,
      addShapeFn,
      select,
      endEdit,
      editingId,
      snap,
      snapToGrid,
    ],
  );

  // Keyboard: delete selected shape, escape to deselect / leave edit.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        endEdit(editingId);
        setSelectedId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        removeShape(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, editingId, removeShape, endEdit]);

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
      setSelectedId,
      editingId,
      setEditingId,
      patchShape,
      removeShape,
      addShape: addShapeFn,
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
      editingId,
      patchShape,
      removeShape,
      addShapeFn,
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
          onPointerMove={panZoom.onPointerMove}
          onPointerUp={panZoom.onPointerUp}
          onPointerCancel={panZoom.onPointerCancel}
        >
          <World camera={camera}>
            {ordered.map((shape) => {
              const kind = kindByType.get(shape.type);
              if (!kind) return null; // unknown shape type — skip silently
              const Component = kind.Component;
              const handlers = dragHandlersFactory(shape.id, shape.x, shape.y);
              const isSelected = selectedId === shape.id;
              const isEditing = editingId === shape.id;
              const isDragging = draggingId === shape.id;
              // Pre-composed shape class. Renderers spread this on their root
              // to opt into `cb-shape` baseline (position, cursor, transition)
              // plus state modifiers (selection ring, z-lift, grabbing cursor).
              const className =
                'cb-shape' +
                (isSelected ? ' cb-shape--selected' : '') +
                (isEditing ? ' cb-shape--editing' : '') +
                (isDragging ? ' cb-shape--dragging' : '');
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
                  onSelect={() => select(shape.id)}
                  onStartEdit={() => setEditingId(shape.id)}
                  onCommitEdit={() => endEdit(shape.id)}
                  onCancelEdit={() => endEdit(shape.id)}
                  patch={(next) => patchShape(shape.id, next)}
                />
              );
            })}
          </World>

          {!hideUI &&
            selectedShape &&
            editingId !== selectedShape.id &&
            renderContextMenu({
              shape: selectedShape,
              camera,
              messages,
              patch: (next) => patchShape(selectedShape.id, next),
              remove: () => removeShape(selectedShape.id),
            })}
        </div>

        <SlotOverlays slots={resolvedSlots} />
      </div>
    </BoardContext.Provider>
  );
}
