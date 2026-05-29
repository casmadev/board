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
import './bmc.css';

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

/* ------------------------------------------------------------------ */
/* Local storage persistence — saves the user's stickies (everything   */
/* except the code-defined BMC regions) so they survive a reload. A   */
/* version suffix on the key lets us bump it later without trying to  */
/* read incompatible old payloads.                                     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'casma:bmc:v1';

interface PersistedShapes {
  shapes: Record<string, Shape>;
  order: string[];
}

function loadPersisted(): PersistedShapes {
  // SSR / private-mode guards: localStorage may be undefined or throw on
  // access. Empty + corrupt + missing all collapse to "no saved data".
  if (typeof window === 'undefined' || !window.localStorage) {
    return { shapes: {}, order: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { shapes: {}, order: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedShapes>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.shapes ||
      !Array.isArray(parsed.order)
    ) {
      return { shapes: {}, order: [] };
    }
    return { shapes: parsed.shapes, order: parsed.order };
  } catch {
    return { shapes: {}, order: [] };
  }
}

// Debounced write — onShapesChange fires on every patch (and drag emits
// many per second). Saving on every frame would beat up localStorage and
// the JSON serializer for no benefit. 400ms catches a settled state.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function queueSave(state: ShapesState) {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => savePersisted(state), 400);
}

function savePersisted(state: ShapesState) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  // Filter to user shapes — the BMC regions are deterministic seeds
  // rebuilt from REGIONS on every mount; persisting them would couple us
  // to that snapshot and re-restore stale geometry if the layout changes.
  const userShapes: Record<string, Shape> = {};
  const userOrder: string[] = [];
  for (const id of state.order) {
    const s = state.shapes[id];
    if (s && s.type !== 'bmc-region') {
      userShapes[id] = s;
      userOrder.push(id);
    }
  }
  const payload: PersistedShapes = { shapes: userShapes, order: userOrder };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / serialization error — silently drop. The runtime state is
    // still consistent; the user just won't have their stickies after a
    // reload. Logging is intentionally avoided so the playground doesn't
    // spam consoles in restricted browser modes.
  }
}

const initialShapes: ShapesState = (() => {
  const shapes: Record<string, Shape> = {};
  const order: string[] = [];
  // BMC regions render first (so user-added stickies appear on top of
  // them in DOM order → z-index doesn't have to compensate).
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
  // Layer persisted stickies on top, preserving their original order.
  // We skip anything that conflicts with a BMC region id so a corrupted
  // save can't replace the regions.
  const persisted = loadPersisted();
  for (const id of persisted.order) {
    if (shapes[id]) continue;
    const s = persisted.shapes[id];
    if (!s) continue;
    shapes[id] = s;
    order.push(id);
  }
  return { shapes, order };
})();

/* ------------------------------------------------------------------ */
/* Region clamping — runs only at drag-end and at spawn time. The      */
/* sticky moves with the cursor unconstrained during the drag itself,  */
/* which keeps the dragged feedback crisp; the snap into a region (or  */
/* out to the canvas) happens once on release, and the CSS transition  */
/* in bmc.css glides the sticky into its final spot.                   */
/*                                                                     */
/* Two rules cover the layout:                                         */
/* 1. Sticky's center lands inside a region — clamp the body inside    */
/*    that region (snap inwards). Handles inner borders.               */
/* 2. Sticky's center lands outside every region but the body still    */
/*    overlaps the BMC rectangle — push the body fully out to the      */
/*    blank canvas (snap outwards). Handles outer borders.             */
/* ------------------------------------------------------------------ */

const REGION_BOXES = REGIONS.map((r) => ({
  id: r.id,
  x: r.col * COL,
  y: r.row * ROW,
  w: r.cols * COL,
  h: r.rows * ROW,
}));

type RegionBox = (typeof REGION_BOXES)[number];

const CLAMP_INSET = 6; // px gap kept between sticky edge and region border

// BMC outer rectangle. Used by the outward-clamp path: if the sticky's
// center is outside every region (i.e. it landed in the blank canvas)
// but its body still overlaps this rectangle, we push the body fully
// out so the sticky never half-rides over an outer region border.
const BMC_BOUNDS = { x: 0, y: 0, w: BMC_WIDTH, h: BMC_HEIGHT };

function regionContaining(shape: Shape): RegionBox | null {
  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  return (
    REGION_BOXES.find(
      (r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h,
    ) ?? null
  );
}

function clampToRegion(shape: Shape, region: RegionBox): Partial<Shape> | void {
  const minX = region.x + CLAMP_INSET;
  const maxX = region.x + region.w - shape.w - CLAMP_INSET;
  const minY = region.y + CLAMP_INSET;
  const maxY = region.y + region.h - shape.h - CLAMP_INSET;
  // Returning nothing when already in bounds means no patch — and React
  // skips the re-render for an unchanged state. Important at drag-end so
  // a sticky that's already cleanly placed doesn't kick off a no-op
  // update + transition.
  const clampedX = Math.min(Math.max(shape.x, minX), maxX);
  const clampedY = Math.min(Math.max(shape.y, minY), maxY);
  if (clampedX === shape.x && clampedY === shape.y) return;
  return { x: clampedX, y: clampedY };
}

/** Outward clamp: the sticky's center is outside every region, but its
 *  body still overlaps the BMC rectangle. Push the body fully out to the
 *  canvas in whichever direction the center is already heading.
 *
 *  We resolve corners (center is past two edges of the BMC, e.g. above
 *  *and* left) by picking the shorter of the two pushes — the sticky
 *  lands closer to where the user dropped it, which usually matches
 *  their intent.
 *
 *  Returns `undefined` when no push is needed: either the body is
 *  already entirely outside the BMC, or the sticky is so deep into the
 *  outside that no edge of the BMC rectangle clips its body. */
function clampOutsideBMC(shape: Shape): Partial<Shape> | void {
  const b = BMC_BOUNDS;
  // Body-vs-BMC intersection test. If the body doesn't overlap the BMC
  // rectangle at all, the sticky is free on the canvas — no clamp.
  const overlaps =
    shape.x < b.x + b.w &&
    shape.x + shape.w > b.x &&
    shape.y < b.y + b.h &&
    shape.y + shape.h > b.y;
  if (!overlaps) return;

  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  // For each axis, "are we crossing OUT on the left or the right?"
  // Compute the candidate target x/y when pushed past that edge.
  // distance is the absolute world-pixel push required; we pick the
  // axis with the smaller push so the sticky lands close to where the
  // user released.
  const candidates: Array<{ axis: 'x' | 'y'; value: number; distance: number }> = [];
  if (cx < b.x) {
    const value = b.x - shape.w - CLAMP_INSET;
    candidates.push({ axis: 'x', value, distance: Math.abs(value - shape.x) });
  } else if (cx >= b.x + b.w) {
    const value = b.x + b.w + CLAMP_INSET;
    candidates.push({ axis: 'x', value, distance: Math.abs(value - shape.x) });
  }
  if (cy < b.y) {
    const value = b.y - shape.h - CLAMP_INSET;
    candidates.push({ axis: 'y', value, distance: Math.abs(value - shape.y) });
  } else if (cy >= b.y + b.h) {
    const value = b.y + b.h + CLAMP_INSET;
    candidates.push({ axis: 'y', value, distance: Math.abs(value - shape.y) });
  }
  if (candidates.length === 0) return; // shouldn't happen — body overlaps but
                                       // center is "inside" both axes? Means
                                       // center is in a region and the
                                       // regionContaining check above would
                                       // have caught it.
  candidates.sort((a, b) => a.distance - b.distance);
  const pick = candidates[0]!;
  return pick.axis === 'x' ? { x: pick.value } : { y: pick.value };
}

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

// Two-rule clamp: inward when the center lands in a region, outward when
// it lands on the canvas with the body still over the BMC. Used at spawn
// and at drag-end only — never during drag-move, so the sticky tracks
// the cursor without any constraint mid-gesture.
function clampShape(shape: Shape): Partial<Shape> | void {
  const region = regionContaining(shape);
  if (region) return clampToRegion(shape, region);
  return clampOutsideBMC(shape);
}

/* ------------------------------------------------------------------ */
/* Top-right control panel: shows a short blurb about the persistence */
/* contract and a Clear-All action that wipes user stickies without   */
/* touching the BMC regions. The button confirm()s first since this   */
/* is irrecoverable from inside the demo.                              */
/* ------------------------------------------------------------------ */

function BmcControlPanel() {
  const { setShapes, shapes } = useCasmaBoard();
  // Count user stickies (everything except BMC regions) so the button
  // can disable itself when there's nothing to clear.
  const userCount = shapes.order.filter(
    (id) => shapes.shapes[id]?.type !== 'bmc-region',
  ).length;

  const clearAll = () => {
    if (userCount === 0) return;
    const plural = userCount === 1 ? 'sticky note' : 'sticky notes';
    if (!window.confirm(`Remove ${userCount} ${plural}?`)) return;
    setShapes((s) => {
      const nextShapes: Record<string, Shape> = {};
      const nextOrder: string[] = [];
      for (const id of s.order) {
        const sh = s.shapes[id];
        if (sh && sh.type === 'bmc-region') {
          nextShapes[id] = sh;
          nextOrder.push(id);
        }
      }
      return { shapes: nextShapes, order: nextOrder };
    });
  };

  return (
    <button
      type="button"
      className="cb-button cb-button--danger cb-button--raised"
      onClick={clearAll}
      disabled={userCount === 0}
    >
      Clear all
    </button>
  );
}

export default function BmcDemo() {
  return (
    <CasmaBoard
      // .bmc-board scopes the position transition in bmc.css. It lives on
      // .cb-root so the rule can target descendant .cb-sticky elements
      // without bleeding into other demos.
      className="bmc-board"
      background="none"
      // bmcRegionKind first so regions render below user-added stickies
      // (each new shape is appended to `order` and renders last → on top).
      shapeKinds={[bmcRegionKind, stickyKind]}
      defaultShapes={initialShapes}
      // Debounced save on every shape change. The save filters out the
      // BMC regions internally so the persisted payload is just the user
      // stickies.
      onShapesChange={queueSave}
      // Clamp only at the discrete moments the user finalizes a position:
      // spawning a sticky and releasing a drag. Mid-drag stays free, so
      // the sticky tracks the cursor 1:1 across borders. The CSS
      // transition in bmc.css smooths the single jump on release.
      onShapeAdd={clampShape}
      onShapeDragEnd={clampShape}
      slots={{
        topLeft: (
          <>
            <DemoNav />
            <AutoCenterCanvas width={BMC_WIDTH} height={BMC_HEIGHT} />
          </>
        ),
        topRight: <BmcControlPanel />,
        bottomCenter: <StickyFanToolbar />,
        // bottomRight omitted → DefaultZoomWidget.
      }}
    />
  );
}
