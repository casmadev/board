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
  createStickyShape,
  deleteShape,
  setStickyColor,
  setStickyText,
  updateShape,
} from './state/reducer';
import { getOrderedShapes } from './state/selectors';
import { screenToWorld } from './geometry/camera';
import { World } from './components/World';
import { StickyNote } from './components/StickyNote';
import { Toolbar } from './components/Toolbar';
import { DEFAULT_DEPTH_3D } from './constants';

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
  // Per-shape version counter — bumped each time editing ends. StickyNote
  // mixes this into its hash so the small random Z rotation rerolls every
  // time the user "puts the note back".
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
    // move the sticky's DOM node via insertBefore, which can release the
    // active pointer capture and abort an in-progress drag. The selected
    // sticky is brought visually on top via CSS z-index instead.
  }, []);

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
        endEdit(editingId);
      }
    },
    [panZoom, tool, generateId, setShapesState, select, endEdit, editingId],
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
        setShapesState((s) => deleteShape(s, selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, editingId, setShapesState, endEdit]);

  const ordered = useMemo(() => getOrderedShapes(shapesState), [shapesState]);
  const selectedShape = selectedId ? shapesState.shapes[selectedId] : undefined;
  const selectedSticky =
    selectedShape && selectedShape.type === 'sticky'
      ? (selectedShape as StickyShape)
      : undefined;

  const handleCommitEdit = useCallback(
    (id: string, text: string) => {
      setShapesState((s) => setStickyText(s, id, text));
      endEdit(id);
    },
    [setShapesState, endEdit],
  );

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
        style={depth3d > 0 ? { perspective: `${depth3d}px` } : undefined}
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
                editVersion={editVersions[shape.id] ?? 0}
                textOverflow={textOverflow}
                depth3d={depth3d}
                messages={messages}
                pointerHandlers={handlers}
                onDoubleClick={() => setEditingId(shape.id)}
                onFocus={() => select(shape.id)}
                onCommitEdit={(text) => handleCommitEdit(shape.id, text)}
                onCancelEdit={() => endEdit(shape.id)}
              />
            );
          })}
        </World>

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
