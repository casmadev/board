import { useState } from 'react';
import {
  CasmaBoard,
  DefaultToolbar,
  useCasmaBoard,
} from '@casmadev/board';
import type { BackgroundStyle, TextOverflow } from '@casmadev/board';
import { DemoNav } from './DemoNav';

/* ------------------------------------------------------------------ */
/* Demo controls — top-right card. App-owned state threaded as props. */
/* ------------------------------------------------------------------ */

interface DemoControlsProps {
  textOverflow: TextOverflow;
  setTextOverflow: (next: TextOverflow) => void;
  background: BackgroundStyle;
  setBackground: (next: BackgroundStyle) => void;
  snapToGrid: boolean;
  setSnapToGrid: (next: boolean) => void;
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
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

/* ------------------------------------------------------------------ */
/* Bottom-left selection summary.                                     */
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
/* MainDemo                                                           */
/* ------------------------------------------------------------------ */

export default function MainDemo() {
  const [textOverflow, setTextOverflow] =
    useState<TextOverflow>('shrink-to-fit');
  const [depth3d, setDepth3d] = useState(800);
  const [background, setBackground] = useState<BackgroundStyle>('dots');
  const [snapToGrid, setSnapToGrid] = useState(false);

  return (
    <CasmaBoard
      textOverflow={textOverflow}
      depth3d={depth3d}
      background={background}
      snapToGrid={snapToGrid}
      slots={{
        topLeft: <DemoNav />,
        topRight: (
          <DemoControlsPanel
            textOverflow={textOverflow}
            setTextOverflow={setTextOverflow}
            background={background}
            setBackground={setBackground}
            snapToGrid={snapToGrid}
            setSnapToGrid={setSnapToGrid}
            depth3d={depth3d}
            setDepth3d={setDepth3d}
          />
        ),
        bottomLeft: <SelectionInspector />,
        // bottomCenter omitted → DefaultToolbar (package default).
        // bottomRight omitted → DefaultZoomWidget (package default).
      }}
    />
  );
}
