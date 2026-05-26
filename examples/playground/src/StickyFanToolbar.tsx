/* Sticky fan toolbar — five color-coded sticky-note buttons fanned in an
   arc. Click spawns at center; drag spawns at drop point (via the
   shared useShapeCreationDrag hook). Shared between the main playground
   and the BMC demo so both can drop user stickies onto the canvas. */

import {
  GRID_SIZE,
  STICKY_COLORS,
  createStickyShape,
  screenToWorld,
  stickyKind,
  useCasmaBoard,
  useShapeCreationDrag,
} from '@casmadev/board';
import type { StickyColor } from '@casmadev/board';

export function StickyFanToolbar() {
  const {
    addShape,
    setSelectedId,
    setTool,
    viewportRef,
    camera,
    generateId,
    snapToGrid,
  } = useCasmaBoard();
  const startDrag = useShapeCreationDrag();

  const spawn = (color: StickyColor) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const world = screenToWorld(camera, {
      x: rect.width / 2,
      y: rect.height / 2,
    });
    const shape = createStickyShape(generateId(), world.x, world.y, { color });
    if (snapToGrid) {
      shape.x = Math.round(shape.x / GRID_SIZE) * GRID_SIZE;
      shape.y = Math.round(shape.y / GRID_SIZE) * GRID_SIZE;
    }
    addShape(shape);
    setSelectedId(shape.id);
    setTool('select');
  };

  const onButtonPointerDown =
    (color: StickyColor) => (e: React.PointerEvent<HTMLButtonElement>) => {
      startDrag(e, {
        createInitialShape: (world) => ({
          kind: stickyKind,
          shape: createStickyShape(generateId(), world.x, world.y, { color }),
        }),
      });
    };

  return (
    <div
      className="fan-toolbar"
      role="toolbar"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {STICKY_COLORS.map((color, i) => {
        const ANGLE_STEP = 7;
        const ARC_RADIUS = 520;
        const angle = (i - (STICKY_COLORS.length - 1) / 2) * ANGLE_STEP;
        const rise = ARC_RADIUS * (1 - Math.cos((angle * Math.PI) / 180));
        return (
          <button
            key={color}
            type="button"
            className={`fan-toolbar__btn fan-toolbar__btn--${color}`}
            style={{
              ['--angle' as string]: `${angle}deg`,
              ['--rise' as string]: `${rise.toFixed(2)}px`,
            } as React.CSSProperties}
            aria-label={`New ${color} sticky`}
            title={`New ${color} sticky`}
            onClick={() => spawn(color)}
            onPointerDown={onButtonPointerDown(color)}
          />
        );
      })}
    </div>
  );
}
