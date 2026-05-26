import { useMemo, useState } from 'react';
import {
  CasmaBoard,
  DefaultToolbar,
  defaultShapeKinds,
  useCasmaBoard,
  worldToScreen,
} from '@casmadev/board';
import type {
  BackgroundStyle,
  Direction,
  Messages,
  ShapeKind,
  ShapeRenderProps,
  Shape,
  TextOverflow,
} from '@casmadev/board';
import {
  en,
  es,
  fr,
  ptBR,
  de,
  ja,
  ar,
  he,
} from '@casmadev/board/locales';
import '@casmadev/board/styles.css';

const LOCALES: Record<string, Messages> = { en, es, fr, 'pt-BR': ptBR, de, ja, ar, he };
const RTL_LOCALES = new Set(['ar', 'he']);

/* ------------------------------------------------------------------ */
/* Demo: a custom shape kind — a colored box with an inline label.    */
/* ------------------------------------------------------------------ */

interface BoxShape {
  id: string;
  type: 'box';
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  hue: number;
}

function BoxRenderer({
  shape,
  pointerHandlers,
  onSelect,
  className,
}: ShapeRenderProps<BoxShape>) {
  // Spreading `className` opts the box into the shared cb-shape baseline
  // (position, cursor, transition) plus the selection ring + grabbing
  // cursor while dragging — no per-shape state styling needed here.
  return (
    <div
      className={className}
      data-shape-id={shape.id}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: shape.h,
        background: `hsl(${shape.hue} 75% 55%)`,
        border: '2px solid rgba(0,0,0,0.15)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        // Resting drop shadow via filter so we don't clash with the
        // class-based selection ring (which uses box-shadow). Sticky
        // sidesteps the same problem by painting its shadow on ::after.
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))',
        userSelect: 'none',
      }}
      onFocus={onSelect}
      tabIndex={0}
      {...pointerHandlers}
    >
      {shape.label}
    </div>
  );
}

const boxKind: ShapeKind<BoxShape> = {
  type: 'box',
  defaultSize: { w: 140, h: 80 },
  create: (id, x, y) => ({
    id,
    type: 'box',
    x: x - 70,
    y: y - 40,
    w: 140,
    h: 80,
    label: 'Box',
    hue: Math.floor(Math.random() * 360),
  }),
  Component: BoxRenderer,
  toolButton: {
    icon: (
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
        <rect
          x="3"
          y="5"
          width="14"
          height="10"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
    label: 'Box',
  },
};

/* ------------------------------------------------------------------ */
/* Demo controls — lifted out of the old page header so the page is   */
/* now full-bleed CasmaBoard. Lives in slots.topRight as a card; all  */
/* state is owned by App and threaded through props.                  */
/* ------------------------------------------------------------------ */

interface DemoControlsProps {
  locale: keyof typeof LOCALES;
  setLocale: (next: keyof typeof LOCALES) => void;
  direction: Direction;
  setDirection: (next: Direction) => void;
  textOverflow: TextOverflow;
  setTextOverflow: (next: TextOverflow) => void;
  background: BackgroundStyle;
  setBackground: (next: BackgroundStyle) => void;
  snapToGrid: boolean;
  setSnapToGrid: (next: boolean) => void;
  enableBoxes: boolean;
  setEnableBoxes: (next: boolean) => void;
  useCustomToolbar: boolean;
  setUseCustomToolbar: (next: boolean) => void;
  useCustomContextMenu: boolean;
  setUseCustomContextMenu: (next: boolean) => void;
  depth3d: number;
  setDepth3d: (next: number) => void;
}

function DemoControlsPanel({
  locale,
  setLocale,
  direction,
  setDirection,
  textOverflow,
  setTextOverflow,
  background,
  setBackground,
  snapToGrid,
  setSnapToGrid,
  enableBoxes,
  setEnableBoxes,
  useCustomToolbar,
  setUseCustomToolbar,
  useCustomContextMenu,
  setUseCustomContextMenu,
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
      <label style={rowStyle}>
        <span style={labelStyle}>Locale</span>
        <select
          value={locale}
          onChange={(e) => {
            const next = e.target.value as keyof typeof LOCALES;
            setLocale(next);
            setDirection(RTL_LOCALES.has(next) ? 'rtl' : 'ltr');
          }}
        >
          {Object.keys(LOCALES).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      <label style={rowStyle}>
        <span style={labelStyle}>Direction</span>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
        >
          <option value="ltr">ltr</option>
          <option value="rtl">rtl</option>
        </select>
      </label>
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
      <label style={rowStyle}>
        <span style={labelStyle}>Background</span>
        <select
          value={background}
          onChange={(e) => setBackground(e.target.value as BackgroundStyle)}
        >
          <option value="dots">dots</option>
          <option value="grid">grid</option>
          <option value="none">none</option>
        </select>
      </label>
      <label style={checkRowStyle}>
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        Snap to grid
      </label>
      <label style={checkRowStyle}>
        <input
          type="checkbox"
          checked={enableBoxes}
          onChange={(e) => setEnableBoxes(e.target.checked)}
        />
        Box kind
      </label>
      <label style={checkRowStyle}>
        <input
          type="checkbox"
          checked={useCustomToolbar}
          onChange={(e) => setUseCustomToolbar(e.target.checked)}
        />
        Custom toolbar
      </label>
      <label style={checkRowStyle}>
        <input
          type="checkbox"
          checked={useCustomContextMenu}
          onChange={(e) => setUseCustomContextMenu(e.target.checked)}
        />
        Custom ctx menu
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
/* Custom context menu: replaces DefaultContextMenu globally.         */
/* Switches on shape.type to do something meaningful for each kind.   */
/* ------------------------------------------------------------------ */

function customContextMenu({
  shape,
  camera,
  patch,
  remove,
}: {
  shape: Shape;
  camera: { x: number; y: number; zoom: number };
  patch: (next: Partial<Shape>) => void;
  remove: () => void;
}) {
  const pos = worldToScreen(camera, {
    x: shape.x + shape.w / 2,
    y: shape.y + shape.h,
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y + 14,
        transform: 'translateX(-50%)',
        zIndex: 3,
        background: 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 10,
        padding: '6px 8px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        fontSize: 12,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span style={{ color: 'rgba(0,0,0,0.55)' }}>{shape.type}</span>
      {shape.type === 'box' && (
        <button
          style={miniBtn}
          onClick={() => patch({ hue: Math.floor(Math.random() * 360) } as Partial<Shape>)}
        >
          🎨
        </button>
      )}
      <button style={{ ...miniBtn, color: '#dc2626' }} onClick={remove}>
        🗑
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [locale, setLocale] = useState<keyof typeof LOCALES>('en');
  const [direction, setDirection] = useState<Direction>('ltr');
  const [textOverflow, setTextOverflow] = useState<TextOverflow>('shrink-to-fit');
  const [depth3d, setDepth3d] = useState(800);
  const [background, setBackground] = useState<BackgroundStyle>('dots');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [enableBoxes, setEnableBoxes] = useState(true);
  const [useCustomContextMenu, setUseCustomContextMenu] = useState(false);
  const [useCustomToolbar, setUseCustomToolbar] = useState(false);

  const messages = useMemo(() => LOCALES[locale], [locale]);

  const shapeKinds = useMemo<ShapeKind<any>[]>(
    () => (enableBoxes ? [...defaultShapeKinds, boxKind] : defaultShapeKinds),
    [enableBoxes],
  );

  return (
    <div style={{ height: '100%' }}>
      <CasmaBoard
        messages={messages}
        direction={direction}
        textOverflow={textOverflow}
        depth3d={depth3d}
        background={background}
        snapToGrid={snapToGrid}
        shapeKinds={shapeKinds}
        contextMenu={useCustomContextMenu ? customContextMenu : undefined}
        slots={{
          topLeft: <TitleChip />,
          topRight: (
            <DemoControlsPanel
              locale={locale}
              setLocale={setLocale}
              direction={direction}
              setDirection={setDirection}
              textOverflow={textOverflow}
              setTextOverflow={setTextOverflow}
              background={background}
              setBackground={setBackground}
              snapToGrid={snapToGrid}
              setSnapToGrid={setSnapToGrid}
              enableBoxes={enableBoxes}
              setEnableBoxes={setEnableBoxes}
              useCustomToolbar={useCustomToolbar}
              setUseCustomToolbar={setUseCustomToolbar}
              useCustomContextMenu={useCustomContextMenu}
              setUseCustomContextMenu={setUseCustomContextMenu}
              depth3d={depth3d}
              setDepth3d={setDepth3d}
            />
          ),
          bottomLeft: <SelectionInspector />,
          // bottomRight omitted → DefaultZoomWidget (package default).
          // bottomCenter omitted → DefaultToolbar. Override only when the
          // checkbox is on, to demonstrate replacing the default.
          ...(useCustomToolbar
            ? {
                bottomCenter: (
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
                ),
              }
            : null),
        }}
      />
    </div>
  );
}
