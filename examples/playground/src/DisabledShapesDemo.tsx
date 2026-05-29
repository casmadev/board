import {
  CasmaBoard,
  createStickyShape,
  screenToWorld,
  stickyKind,
  useCasmaBoard,
  useShapeCreationDrag,
} from '@casmadev/board';
import { FitCameraToContents } from './FitCameraToContents';
import type {
  Shape,
  ShapeKind,
  ShapeRenderProps,
  ShapesState,
  StickyShape,
} from '@casmadev/board';
import { DemoNav } from './DemoNav';

/* ------------------------------------------------------------------ */
/* Custom shape kind — a "task card". Two-row rectangle with a title  */
/* and a body. Demonstrates that the package's `Shape.disabled` flag  */
/* works for any kind, not just stickies.                             */
/* ------------------------------------------------------------------ */

interface CardShape extends Shape {
  type: 'card';
  title: string;
  body: string;
}

const CARD_W = 240;
const CARD_H = 120;

function CardRenderer({
  shape,
  className,
  selected,
  editing,
  pointerHandlers,
  onSelect,
}: ShapeRenderProps<CardShape>) {
  // The board's selection ring is a box-shadow applied via the
  // .cb-shape--selected class. Because this card sets its own box-shadow
  // inline, and inline styles outrank stylesheet rules, that class ring
  // gets suppressed — so we compose it in ourselves. (The sticky kind gets
  // it for free since its shadow lives in CSS, where the class can stack.)
  // --cb-selection-ring is defined on .cb-root, which this card sits in.
  const baseShadow = shape.disabled
    ? '0 1px 2px rgba(0,0,0,0.08)'
    : '0 8px 16px rgba(0,0,0,0.10)';
  const boxShadow =
    selected || editing ? `${baseShadow}, var(--cb-selection-ring)` : baseShadow;
  return (
    <div
      data-shape-id={shape.id}
      className={className}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: shape.h,
        // Card chrome. The `cb-shape--disabled` modifier from the package
        // takes care of the cursor; we tint a bit dimmer here so the
        // locked state reads visually too.
        background: shape.disabled ? '#e5e7eb' : '#ffffff',
        border: shape.disabled
          ? '1px solid rgba(0,0,0,0.12)'
          : '1px solid rgba(0,0,0,0.16)',
        borderRadius: 10,
        boxShadow,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        color: shape.disabled ? 'rgba(0,0,0,0.55)' : '#1a1a1a',
        userSelect: 'none',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      onFocus={onSelect}
      tabIndex={shape.disabled ? -1 : 0}
      {...pointerHandlers}
    >
      <div style={{ fontWeight: 600, fontSize: 15 }}>{shape.title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.35 }}>{shape.body}</div>
    </div>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden focusable={false}>
      <rect
        x="3"
        y="4"
        width="14"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <line x1="6" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.4" />
      <line x1="6" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const cardKind: ShapeKind<CardShape> = {
  type: 'card',
  defaultSize: { w: CARD_W, h: CARD_H },
  create: (id, x, y) => ({
    id,
    type: 'card',
    x: x - CARD_W / 2,
    y: y - CARD_H / 2,
    w: CARD_W,
    h: CARD_H,
    title: 'New card',
    body: 'Double-click to fill in the details (skipped for the demo).',
  }),
  Component: CardRenderer,
  toolButton: {
    icon: <CardIcon />,
    label: 'New card',
  },
};

/* ------------------------------------------------------------------ */
/* Custom toolbar — a single big "Card" button. Click spawns at the   */
/* viewport center; drag spawns at the drop point. Demonstrates a     */
/* minimal toolbar that lives entirely in playground code.            */
/* ------------------------------------------------------------------ */

function CardToolbar() {
  const {
    createShapeWithTool,
    viewportRef,
    camera,
    generateId,
  } = useCasmaBoard();
  const startDrag = useShapeCreationDrag();

  const spawnAtCenter = () => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const world = screenToWorld(camera, {
      x: rect.width / 2,
      y: rect.height / 2,
    });
    // Reuse the board's createShapeWithTool — it handles snap + select +
    // tool reset. Tool id is the card kind's type since it has no custom
    // toolButton.toolId override.
    createShapeWithTool('card', world);
  };

  return (
    <div
      role="toolbar"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        background: 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
        padding: 6,
      }}
    >
      <button
        type="button"
        aria-label="New card"
        title="Click to spawn at center, or drag onto the canvas"
        onClick={spawnAtCenter}
        onPointerDown={(e) =>
          startDrag(e, {
            createInitialShape: (world) => ({
              kind: cardKind,
              shape: cardKind.create(generateId(), world.x, world.y),
            }),
          })
        }
        style={{
          appearance: 'none',
          border: 'none',
          background: '#1a1a1a',
          color: 'white',
          fontWeight: 600,
          fontSize: 13,
          padding: '10px 16px',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <CardIcon />
        New card
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pre-populated canvas: one normal card, one disabled card with a    */
/* blue sticky note pointing up at it.                                */
/* ------------------------------------------------------------------ */

const initialShapes: ShapesState = (() => {
  const NORMAL_ID = 'card-normal';
  const DISABLED_ID = 'card-disabled';
  const NOTE_ID = 'note-disabled-hint';

  const normalCard: CardShape = {
    id: NORMAL_ID,
    type: 'card',
    x: 360,
    y: 200,
    w: CARD_W,
    h: CARD_H,
    title: 'Live card',
    body: 'Drag me, double-click to focus, right-click for a fresh menu.',
  };
  const disabledCard: CardShape = {
    id: DISABLED_ID,
    type: 'card',
    x: 360,
    y: 380,
    w: CARD_W,
    h: CARD_H,
    title: 'Locked card',
    body: 'Try clicking — the board treats this one as inert.',
    disabled: true,
  };
  const hintNote: StickyShape = {
    ...createStickyShape(NOTE_ID, 0, 0, { color: 'blue' }),
    // Position the note centered horizontally with the cards, just below
    // the disabled one.
    x: disabledCard.x + (CARD_W - 192) / 2,
    y: disabledCard.y + CARD_H + 24,
    text: 'This one is disabled 👆',
  };
  return {
    shapes: {
      [NORMAL_ID]: normalCard,
      [DISABLED_ID]: disabledCard,
      [NOTE_ID]: hintNote,
    },
    order: [NORMAL_ID, DISABLED_ID, NOTE_ID],
  };
})();

/* ------------------------------------------------------------------ */
/* Top-right info card explaining what's on the board.                */
/* ------------------------------------------------------------------ */

function InfoPanel() {
  return (
    <div className="cb-panel cb-panel--narrow">
      <h2 className="cb-panel__title">Shape.disabled</h2>
      <hr className="cb-separator" />
      <p className="cb-panel__text">
        Set <code>disabled: true</code> on any shape to make it inert — the
        board passes no-op pointer handlers and adds a{' '}
        <code>cb-shape--disabled</code> class. Pre-populated here are a live
        card and a locked one. The bottom toolbar spawns more live cards;
        the sticky note is just data, also editable.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DisabledShapesDemo                                                 */
/* ------------------------------------------------------------------ */

export default function DisabledShapesDemo() {
  return (
    <CasmaBoard
      background="grid"
      // Sticky kind is registered so the annotation note renders; the
      // toolbar still only exposes cards.
      shapeKinds={[cardKind, stickyKind]}
      defaultShapes={initialShapes}
      slots={{
        topLeft: (
          <>
            <DemoNav />
            {/* Frame the seeded cards + note on load. maxZoom={1} keeps the
                small cluster at native size rather than magnifying it. With
                no `bounds`, it fits every shape on the board. */}
            <FitCameraToContents maxZoom={1} />
          </>
        ),
        topRight: <InfoPanel />,
        bottomCenter: <CardToolbar />,
      }}
    />
  );
}
