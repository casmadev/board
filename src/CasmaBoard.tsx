import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CasmaBoardProps, StickyColor, StickyShape, ToolId } from './types';
import { useShapes } from './hooks/useShapes';
import { useCamera } from './hooks/useCamera';
import { useMessages } from './hooks/useMessages';
import { usePanZoom } from './hooks/usePanZoom';
import { useDragShape } from './hooks/useDragShape';
import {
  addShape,
  bringToFront,
  createStickyShape,
  deleteShape,
  moveShape,
  setStickyColor,
  setStickyText,
  updateShape,
} from './state/reducer';
import { getOrderedShapes } from './state/selectors';
import { screenToWorld } from './geometry/camera';
import { World } from './components/World';
import { StickyNote } from './components/StickyNote';
import { EditOverlay } from './components/EditOverlay';
import { Toolbar } from './components/Toolbar';

const BASE_FONT_SIZE = 16;

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
    generateId = defaultIdGen,
  } = props;

  const [shapesState, setShapesState] = useShapes(
    shapesProp,
    defaultShapes,
    onShapesChange,
  );
  const [camera, setCamera] = useCamera(cameraProp, defaultCamera, onCameraChange);
  const messages = useMessages(messagesOverride);

  const [tool, setTool] = useState<ToolId>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const panZoom = usePanZoom({ viewportRef, camera, setCamera });

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setShapesState((s) => bringToFront(s, id));
  }, [setShapesState]);

  const dragHandlersFactory = useDragShape({
    cameraRef,
    onSelect: select,
    onMove: (id, x, y) =>
      setShapesState((s) => updateShape(s, id, { x, y })),
  });

  // Click on empty viewport: create sticky (sticky tool) or deselect.
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

      if (tool === 'sticky') {
        const sticky = createStickyShape(generateId(), world.x, world.y);
        setShapesState((s) => addShape(s, sticky));
        select(sticky.id);
        setTool('select');
      } else {
        select(null);
        setEditingId(null);
      }
    },
    [panZoom, tool, generateId, setShapesState, select],
  );

  // Keyboard: delete selected shape, escape to deselect / leave edit.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setEditingId(null);
        setSelectedId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        setShapesState((s) => deleteShape(s, selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, setShapesState]);

  const ordered = useMemo(() => getOrderedShapes(shapesState), [shapesState]);
  const selectedShape = selectedId ? shapesState.shapes[selectedId] : undefined;
  const editingShape = editingId ? shapesState.shapes[editingId] : undefined;
  const editingSticky =
    editingShape && editingShape.type === 'sticky' ? editingShape : undefined;
  const selectedSticky =
    selectedShape && selectedShape.type === 'sticky'
      ? (selectedShape as StickyShape)
      : undefined;

  const handleColorChange = useCallback(
    (color: StickyColor) => {
      if (!selectedSticky) return;
      setShapesState((s) => setStickyColor(s, selectedSticky.id, color));
    },
    [selectedSticky, setShapesState],
  );

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    setShapesState((s) => deleteShape(s, selectedId));
    setSelectedId(null);
  }, [selectedId, setShapesState]);

  const cursorMode =
    tool === 'sticky'
      ? 'cb-root--cursor-add'
      : panZoom.isSpaceHeld()
        ? 'cb-root--cursor-grab'
        : '';

  return (
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
        className="cb-viewport"
        onPointerDown={handleViewportPointerDown}
        onPointerMove={panZoom.onPointerMove}
        onPointerUp={panZoom.onPointerUp}
        onPointerCancel={panZoom.onPointerCancel}
      >
        <World camera={camera}>
          {ordered.map((shape) => {
            const handlers = dragHandlersFactory(shape.id, shape.x, shape.y);
            return (
              <StickyNote
                key={shape.id}
                shape={shape}
                selected={selectedId === shape.id}
                editing={editingId === shape.id}
                messages={messages}
                pointerHandlers={handlers}
                onDoubleClick={() => setEditingId(shape.id)}
                onFocus={() => select(shape.id)}
              />
            );
          })}
        </World>

        {editingSticky && (
          <EditOverlay
            shape={editingSticky}
            camera={camera}
            baseFontSize={BASE_FONT_SIZE}
            onCommit={(text) => {
              setShapesState((s) => setStickyText(s, editingSticky.id, text));
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        )}

        {ordered.length === 0 && (
          <div className="cb-empty-hint">{messages.hints.emptyCanvas}</div>
        )}
      </div>

      {!hideUI && (
        <Toolbar
          messages={messages}
          tool={tool}
          onToolChange={setTool}
          selectedColor={selectedSticky?.color}
          onSelectedColorChange={selectedSticky ? handleColorChange : undefined}
          canDelete={Boolean(selectedId)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
