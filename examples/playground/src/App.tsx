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
  selected,
  pointerHandlers,
  onSelect,
}: ShapeRenderProps<BoxShape>) {
  return (
    <div
      data-shape-id={shape.id}
      style={{
        position: 'absolute',
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: shape.h,
        background: `hsl(${shape.hue} 75% 55%)`,
        border: selected ? '2px solid #2563eb' : '2px solid rgba(0,0,0,0.15)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        cursor: 'grab',
        boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
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
/* Custom slot content: a live zoom readout in the top-right corner.  */
/* Reads board state via useCasmaBoard().                             */
/* ------------------------------------------------------------------ */

function ZoomReadout() {
  const { camera, setCamera } = useCasmaBoard();
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 13,
        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
      }}
    >
      <button
        onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(0.1, c.zoom / 1.2) }))}
        style={miniBtn}
      >
        −
      </button>
      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'center' }}>
        {Math.round(camera.zoom * 100)}%
      </span>
      <button
        onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(8, c.zoom * 1.2) }))}
        style={miniBtn}
      >
        +
      </button>
    </div>
  );
}

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          flexWrap: 'wrap',
        }}
      >
        <strong>CasmaBoard playground</strong>
        <label>
          Locale:&nbsp;
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
        <label>
          Direction:&nbsp;
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
          >
            <option value="ltr">ltr</option>
            <option value="rtl">rtl</option>
          </select>
        </label>
        <label>
          Text overflow:&nbsp;
          <select
            value={textOverflow}
            onChange={(e) => setTextOverflow(e.target.value as TextOverflow)}
          >
            <option value="shrink-to-fit">shrink-to-fit</option>
            <option value="truncate">truncate</option>
          </select>
        </label>
        <label>
          Background:&nbsp;
          <select
            value={background}
            onChange={(e) => setBackground(e.target.value as BackgroundStyle)}
          >
            <option value="dots">dots</option>
            <option value="grid">grid</option>
            <option value="none">none</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
          />
          Snap
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={enableBoxes}
            onChange={(e) => setEnableBoxes(e.target.checked)}
          />
          Box kind
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={useCustomToolbar}
            onChange={(e) => setUseCustomToolbar(e.target.checked)}
          />
          Custom toolbar
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={useCustomContextMenu}
            onChange={(e) => setUseCustomContextMenu(e.target.checked)}
          />
          Custom ctx menu
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          3D depth:&nbsp;
          <input
            type="range"
            min={0}
            max={2400}
            step={50}
            value={depth3d}
            onChange={(e) => setDepth3d(Number(e.target.value))}
            style={{ width: 140 }}
          />
          <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 48 }}>
            {depth3d === 0 ? 'off' : `${depth3d}px`}
          </span>
        </label>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
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
            topRight: <ZoomReadout />,
            bottomRight: <SelectionInspector />,
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
    </div>
  );
}
