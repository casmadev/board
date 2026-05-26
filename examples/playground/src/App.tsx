import { useState } from 'react';
import {
  CasmaBoard,
  DefaultToolbar,
  GRID_SIZE,
  STICKY_COLORS,
  createStickyShape,
  screenToWorld,
  stickyKind,
  useCasmaBoard,
  useShapeCreationDrag,
} from '@casmadev/board';
import type {
  BackgroundStyle,
  StickyColor,
  TextOverflow,
} from '@casmadev/board';
import '@casmadev/board/styles.css';
import './fan-toolbar.css';

/* ------------------------------------------------------------------ */
/* Demo controls — lifted out of the old page header so the page is   */
/* now full-bleed CasmaBoard. Lives in slots.topRight as a card; all  */
/* state is owned by App and threaded through props.                  */
/* ------------------------------------------------------------------ */

type ToolbarVariant = 'default' | 'wrapped' | 'fan';

interface DemoControlsProps {
  textOverflow: TextOverflow;
  setTextOverflow: (next: TextOverflow) => void;
  background: BackgroundStyle;
  setBackground: (next: BackgroundStyle) => void;
  snapToGrid: boolean;
  setSnapToGrid: (next: boolean) => void;
  toolbarVariant: ToolbarVariant;
  setToolbarVariant: (next: ToolbarVariant) => void;
  depth3d: number;
  setDepth3d: (next: number) => void;
}

const BACKGROUNDS: BackgroundStyle[] = ['dots', 'grid', 'none'];

function DemoControlsPanel({
  textOverflow,
  setTextOverflow,
  background,
  setBackground,
  snapToGrid,
  setSnapToGrid,
  toolbarVariant,
  setToolbarVariant,
  depth3d,
  setDepth3d,
}: DemoControlsProps) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 10,
        padding: 10,
        boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 12,
        minWidth: 220,
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.2,
          color: 'rgba(0,0,0,0.7)',
          textTransform: 'uppercase',
          paddingBottom: 4,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        Demo parameters
      </h2>
      <label style={rowStyle}>
        <span style={labelStyle}>Text overflow</span>
        <select
          value={textOverflow}
          onChange={(e) => setTextOverflow(e.target.value as TextOverflow)}
        >
          <option value="shrink-to-fit">shrink-to-fit</option>
          <option value="truncate">truncate</option>
        </select>
      </label>
      <fieldset style={fieldsetStyle}>
        <legend style={labelStyle}>Background</legend>
        <div style={{ display: 'inline-flex', gap: 10 }}>
          {BACKGROUNDS.map((bg) => (
            <label key={bg} style={checkRowStyle}>
              <input
                type="radio"
                name="background"
                value={bg}
                checked={background === bg}
                onChange={() => setBackground(bg)}
              />
              {bg}
            </label>
          ))}
        </div>
      </fieldset>
      <label style={checkRowStyle}>
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        Snap to grid
      </label>
      <label style={rowStyle}>
        <span style={labelStyle}>Toolbar</span>
        <select
          value={toolbarVariant}
          onChange={(e) => setToolbarVariant(e.target.value as ToolbarVariant)}
        >
          <option value="default">Default — tool picker</option>
          <option value="wrapped">Default in dark chrome (wrapped)</option>
          <option value="fan">Sticky color fan</option>
        </select>
      </label>
      <label style={{ ...rowStyle, alignItems: 'center' }}>
        <span style={labelStyle}>
          3D depth
          <span
            style={{
              fontVariantNumeric: 'tabular-nums',
              color: 'rgba(0,0,0,0.55)',
              marginInlineStart: 6,
            }}
          >
            {depth3d === 0 ? 'off' : `${depth3d}px`}
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={2400}
          step={50}
          value={depth3d}
          onChange={(e) => setDepth3d(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </label>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(0,0,0,0.65)',
  fontWeight: 500,
};

const checkRowStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const fieldsetStyle: React.CSSProperties = {
  border: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const miniBtn: React.CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(0,0,0,0.1)',
  background: '#fafaf7',
  width: 22,
  height: 22,
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1,
  // Flex-center so any glyph (incl. emoji with off-baseline metrics) sits
  // in the middle of the button instead of drifting to a corner.
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

/* ------------------------------------------------------------------ */
/* Top-left: title chip. Pure decoration to prove slots accept any    */
/* ReactNode and don't need to consume context.                       */
/* ------------------------------------------------------------------ */

function TitleChip() {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 8,
        padding: '6px 12px',
        fontWeight: 600,
        fontSize: 13,
        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
      }}
    >
      CasmaBoard playground
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky fan toolbar — custom bottomCenter slot demo. Five big       */
/* color-coded sticky-note buttons fanned out in an arc. Clicking a   */
/* button spawns a sticky of that color at the viewport center;       */
/* pressing and dragging onto the canvas spawns at the drop point     */
/* (reuses the package's useShapeCreationDrag hook for preview +      */
/* cancel). No Select button, no tool state — the buttons are pure    */
/* spawners.                                                          */
/* ------------------------------------------------------------------ */

function StickyFanToolbar() {
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
    // Spawn at the visible viewport center, then snap if the board's
    // snap-to-grid prop is on. We bypass createShapeWithTool because that
    // helper always uses the default sticky color; here we want per-button
    // colors so we call createStickyShape directly with a color override.
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
      // Stop pointerdown bubbling so the viewport doesn't deselect when
      // the user presses on a button (existing toolbar convention).
      onPointerDown={(e) => e.stopPropagation()}
    >
      {STICKY_COLORS.map((color, i) => {
        // Fan around a virtual pivot ARC_RADIUS px below the bottom of
        // each button. Each button rotates by its own angle around its
        // own bottom-center; the matching `rise = R(1 − cos angle)`
        // pushes outer buttons down so all bottoms land on the shared
        // circular arc — what makes the fan read as a true curve
        // rather than as separately-tilted rectangles.
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

/* ------------------------------------------------------------------ */
/* Bottom-right: deselect button + selection summary.                 */
/* ------------------------------------------------------------------ */

function SelectionInspector() {
  const { selectedShape, setSelectedId } = useCasmaBoard();
  if (!selectedShape) return null;
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
        display: 'inline-flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <span>
        Selected <strong>{selectedShape.type}</strong>
      </span>
      <button onClick={() => setSelectedId(null)} style={miniBtn}>
        clear
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [textOverflow, setTextOverflow] = useState<TextOverflow>('shrink-to-fit');
  const [depth3d, setDepth3d] = useState(800);
  const [background, setBackground] = useState<BackgroundStyle>('dots');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [toolbarVariant, setToolbarVariant] = useState<ToolbarVariant>('default');

  return (
    <div style={{ height: '100%' }}>
      <CasmaBoard
        textOverflow={textOverflow}
        depth3d={depth3d}
        background={background}
        snapToGrid={snapToGrid}
        slots={{
          topLeft: <TitleChip />,
          topRight: (
            <DemoControlsPanel
              textOverflow={textOverflow}
              setTextOverflow={setTextOverflow}
              background={background}
              setBackground={setBackground}
              snapToGrid={snapToGrid}
              setSnapToGrid={setSnapToGrid}
              toolbarVariant={toolbarVariant}
              setToolbarVariant={setToolbarVariant}
              depth3d={depth3d}
              setDepth3d={setDepth3d}
            />
          ),
          bottomLeft: <SelectionInspector />,
          // bottomRight omitted → DefaultZoomWidget (package default).
          // Each variant owns its own creation-flow policy: DefaultToolbar
          // uses its defaults; the wrapped variant just adds dark chrome
          // around it; the fan toolbar handles click + drag internally.
          bottomCenter:
            toolbarVariant === 'fan' ? (
              <StickyFanToolbar />
            ) : toolbarVariant === 'wrapped' ? (
              <div
                style={{
                  display: 'inline-flex',
                  gap: 8,
                  padding: 6,
                  background: '#1a1a1a',
                  color: 'white',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, paddingInlineStart: 6 }}>
                  custom
                </span>
                <DefaultToolbar />
              </div>
            ) : (
              <DefaultToolbar />
            ),
        }}
      />
    </div>
  );
}
