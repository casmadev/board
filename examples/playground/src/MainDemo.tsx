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
    <div className="cb-panel cb-panel--scroll" style={{ minWidth: 220 }}>
      <h2 className="cb-panel__title">Demo parameters</h2>
      <hr className="cb-separator" />
      <label className="cb-field">
        <span className="cb-label">Text overflow</span>
        <select
          className="cb-select"
          value={textOverflow}
          onChange={(e) => setTextOverflow(e.target.value as TextOverflow)}
        >
          <option value="shrink-to-fit">shrink-to-fit</option>
          <option value="truncate">truncate</option>
        </select>
      </label>
      <hr className="cb-separator" />
      <fieldset className="cb-field">
        <legend className="cb-label">Background</legend>
        <div className="cb-option-group">
          {BACKGROUNDS.map((bg) => (
            <label key={bg} className="cb-option">
              <input
                className="cb-radio"
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
      <hr className="cb-separator" />
      <label className="cb-option">
        <input
          className="cb-checkbox"
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        Snap to grid
      </label>
      <hr className="cb-separator" />
      <label className="cb-field">
        <span className="cb-label">
          3D depth
          <span className="cb-label__hint">
            {depth3d === 0 ? 'off' : `${depth3d}px`}
          </span>
        </span>
        <input
          className="cb-range"
          type="range"
          min={0}
          max={2400}
          step={50}
          value={depth3d}
          onChange={(e) => setDepth3d(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom-left selection summary.                                     */
/* ------------------------------------------------------------------ */

function SelectionInspector() {
  const { selectedShape, setSelectedId } = useCasmaBoard();
  if (!selectedShape) return null;
  return (
    <div className="cb-panel cb-panel--inline">
      <span>
        Selected <strong>{selectedShape.type}</strong>
      </span>
      <button
        type="button"
        className="cb-button cb-button--sm"
        onClick={() => setSelectedId(null)}
      >
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
