import { useLayoutEffect } from 'react';
import { CasmaBoard, stickyKind, useCasmaBoard } from '@casmadev/board';
import type {
  Shape,
  ShapeKind,
  ShapeRenderProps,
  ShapesState,
} from '@casmadev/board';
import { DemoNav } from './DemoNav';
import { StickyFanToolbar } from './StickyFanToolbar';

/* ------------------------------------------------------------------ */
/* Custom shape kind: a Business Model Canvas region. Rendered as a   */
/* bordered rectangle with a title at the top. The board itself has   */
/* no idea this is a "BMC" — the kind is just another ShapeKind, and  */
/* the regions are pre-populated with `disabled: true` so users can't */
/* select / drag / edit them. All BMC-specific layout + content lives */
/* in this file.                                                      */
/* ------------------------------------------------------------------ */

interface BmcRegion extends Shape {
  type: 'bmc-region';
  title: string;
}

function BmcRegionRenderer({
  shape,
  className,
  pointerHandlers,
}: ShapeRenderProps<BmcRegion>) {
  return (
    <div
      data-shape-id={shape.id}
      className={className}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: shape.h,
        // Push the region 1px back on Z so sticky notes (which sit at
        // z=0 but tilt forward via rotateX) never z-fight with the
        // region's plane where they overlap.
        transform: 'translateZ(-1px)',
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1.5px solid rgba(0, 0, 0, 0.45)',
        boxSizing: 'border-box',
        padding: '16px 20px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      {...pointerHandlers}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: 'rgba(0, 0, 0, 0.7)',
        }}
      >
        {shape.title}
      </div>
    </div>
  );
}

const bmcRegionKind: ShapeKind<BmcRegion> = {
  type: 'bmc-region',
  defaultSize: { w: 480, h: 280 },
  // Users don't spawn BMC regions from a toolbar — the demo seeds them
  // with `defaultShapes` and they stay disabled. `create` still has to
  // exist to satisfy the ShapeKind contract, so we return a sensible
  // default in case some future surface decides to call it.
  create: (id, x, y) => ({
    id,
    type: 'bmc-region',
    x: x - 240,
    y: y - 140,
    w: 480,
    h: 280,
    title: 'Region',
    disabled: true,
  }),
  Component: BmcRegionRenderer,
  // No toolButton — these aren't user-spawnable from the standard
  // toolbar pattern.
};

/* ------------------------------------------------------------------ */
/* Standard Business Model Canvas grid. 5-column top section (2 rows  */
/* high), 2-column bottom section. Each column = 480px (~2 stickies   */
/* wide), each row = 450px so the total canvas is 2400 × 1350 — the   */
/* same 16:9 aspect ratio as the screens this is most likely shown on,*/
/* so the auto-center fits both axes simultaneously.                  */
/* ------------------------------------------------------------------ */

const COL = 480;
const ROW = 450;
const BMC_WIDTH = 5 * COL;
const BMC_HEIGHT = 3 * ROW;

type RegionSpec = {
  id: string;
  title: string;
  col: number; // 0-indexed
  row: number; // 0-indexed
  cols: number; // span
  rows: number; // span
};

const REGIONS: RegionSpec[] = [
  { id: 'bmc-key-partners',          title: 'Key Partners',          col: 0, row: 0, cols: 1, rows: 2 },
  { id: 'bmc-key-activities',        title: 'Key Activities',        col: 1, row: 0, cols: 1, rows: 1 },
  { id: 'bmc-key-resources',         title: 'Key Resources',         col: 1, row: 1, cols: 1, rows: 1 },
  { id: 'bmc-value-propositions',    title: 'Value Propositions',    col: 2, row: 0, cols: 1, rows: 2 },
  { id: 'bmc-customer-relationships', title: 'Customer Relationships', col: 3, row: 0, cols: 1, rows: 1 },
  { id: 'bmc-channels',              title: 'Channels',              col: 3, row: 1, cols: 1, rows: 1 },
  { id: 'bmc-customer-segments',     title: 'Customer Segments',     col: 4, row: 0, cols: 1, rows: 2 },
  { id: 'bmc-cost-structure',        title: 'Cost Structure',        col: 0, row: 2, cols: 2.5, rows: 1 },
  { id: 'bmc-revenue-streams',       title: 'Revenue Streams',       col: 2.5, row: 2, cols: 2.5, rows: 1 },
];

const initialShapes: ShapesState = (() => {
  const shapes: Record<string, Shape> = {};
  const order: string[] = [];
  for (const r of REGIONS) {
    const region: BmcRegion = {
      id: r.id,
      type: 'bmc-region',
      x: r.col * COL,
      y: r.row * ROW,
      w: r.cols * COL,
      h: r.rows * ROW,
      title: r.title,
      disabled: true,
    };
    shapes[r.id] = region;
    order.push(r.id);
  }
  return { shapes, order };
})();

/* ------------------------------------------------------------------ */
/* AutoCenterCanvas — invisible helper that measures the viewport on  */
/* mount and centers + fits a region of world-coordinate `width`×     */
/* `height` inside it. Avoids hard-coding a `defaultCamera` that      */
/* assumes a particular window size.                                  */
/*                                                                    */
/* useLayoutEffect runs after DOM mutation but before paint, so the   */
/* user never sees an off-center frame on load.                       */
/* ------------------------------------------------------------------ */

function AutoCenterCanvas({
  width,
  height,
  padding = 0.95,
}: {
  width: number;
  height: number;
  padding?: number;
}) {
  const { viewportRef, setCamera } = useCasmaBoard();
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const zoom = Math.min(
      (rect.width * padding) / width,
      (rect.height * padding) / height,
    );
    setCamera({
      x: (rect.width - width * zoom) / 2,
      y: (rect.height - height * zoom) / 2,
      zoom,
    });
    // intentionally empty deps — center once on mount, then let the
    // user pan / zoom freely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/* BmcDemo                                                            */
/* ------------------------------------------------------------------ */

export default function BmcDemo() {
  return (
    <CasmaBoard
      background="none"
      // bmcRegionKind first so regions render below user-added stickies
      // (each new shape is appended to `order` and renders last → on top).
      shapeKinds={[bmcRegionKind, stickyKind]}
      defaultShapes={initialShapes}
      slots={{
        topLeft: (
          <>
            <DemoNav />
            <AutoCenterCanvas width={BMC_WIDTH} height={BMC_HEIGHT} />
          </>
        ),
        bottomCenter: <StickyFanToolbar />,
        // bottomRight omitted → DefaultZoomWidget.
      }}
    />
  );
}
