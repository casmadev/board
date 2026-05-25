# @casmadev/board

A React whiteboard component built with **DOM + CSS** — no `<canvas>`.
Sticky notes with a handwritten font, slight 3D tilt that
responds to camera motion, infinite pan & zoom, multilingual UI (8 shipped
locales including RTL), and full TypeScript types.

```tsx
import { CasmaBoard } from '@casmadev/board';
import '@casmadev/board/styles.css';

export default function App() {
  return <CasmaBoard />;
}
```

## Install

```sh
npm install @casmadev/board
```

Peer dependencies: `react >=18`, `react-dom >=18`. The package itself ships
with zero runtime deps.

Don't forget the stylesheet:

```ts
import '@casmadev/board/styles.css';
```

## Quick start

```tsx
import { CasmaBoard } from '@casmadev/board';
import { ptBR } from '@casmadev/board/locales';
import '@casmadev/board/styles.css';

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <CasmaBoard
        messages={ptBR}
        background="grid"
        snapToGrid
      />
    </div>
  );
}
```

## Props

All optional. The component is uncontrolled by default but accepts controlled
state for `shapes` and `camera`.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `shapes` / `defaultShapes` | `ShapesState` | empty | Controlled or seeded shape state (`{ shapes: Record<id, Shape>, order: string[] }`). |
| `onShapesChange` | `(next: ShapesState) => void` | — | Fires on every shape mutation. |
| `camera` / `defaultCamera` | `Camera` | `{ x: 0, y: 0, zoom: 1 }` | Controlled or seeded camera. |
| `onCameraChange` | `(next: Camera) => void` | — | Fires on pan/zoom. |
| `messages` | `Partial<Messages>` | `en` defaults | UI strings (toolbar labels, color names, ARIA, hints). Deep-merged with the English defaults. |
| `direction` | `'ltr' \| 'rtl'` | `'ltr'` | Sets `dir` on the root; toolbar position + logical CSS flip automatically. |
| `background` | `'dots' \| 'grid' \| 'none'` | `'dots'` | Infinite backdrop style. Pans & zooms with the camera. |
| `snapToGrid` | `boolean` | `false` | Snap created/dragged shape positions to the 24px grid. |
| `textOverflow` | `'shrink-to-fit' \| 'truncate'` | `'shrink-to-fit'` | Sticky text behavior when content exceeds the note. Shrink auto-fits the font; truncate keeps a fixed font and appends `…`. |
| `depth3d` | `number` | `800` | CSS perspective (px) for the sticky tilt. Smaller = stronger perspective. `0` disables 3D. |
| `hideUI` | `boolean` | `false` | Hide every default UI surface — slots, default toolbar, context menu. |
| `generateId` | `() => string` | `crypto.randomUUID` | Inject a deterministic id generator (useful for SSR / tests). |
| `className`, `style` | — | — | Passed to the root container. |
| `shapeKinds` | `ShapeKind<any>[]` | `defaultShapeKinds` (sticky only) | Plugin array of shape types the board knows how to render and create. See [Customization](#customization). |
| `defaultTool` | `ToolId` | `'select'` | Initial tool. Either `'select'` or any shape kind's tool id. |
| `slots` | `Slots` | `{}` | Six overlay slots — see [Slots](#slots). |
| `contextMenu` | `(props) => ReactNode` | `DefaultContextMenu` | Render function for the per-shape context menu. |

## Internationalization

The component never imports a translation framework — it takes a `messages`
prop and ships locales as named exports.

```tsx
import { CasmaBoard } from '@casmadev/board';
import { es, ja, ar } from '@casmadev/board/locales';
```

Shipped locales: `en`, `es`, `fr`, `ptBR`, `de`, `ja`, `ar`, `he`. Each is
its own subpath export so unused languages tree-shake. RTL is handled by
`direction="rtl"` plus CSS logical properties; the included Arabic and
Hebrew locales are paired with this.

Partial overrides are fine — missing keys fall back to English:

```tsx
<CasmaBoard messages={{ toolbar: { delete: 'Yeet' } }} />
```

## Theming

Every paintable surface is driven by CSS variables defined on `.cb-root`.
Override any of them in your own stylesheet:

```css
.cb-root {
  --cb-bg: #1a1a1a;
  --cb-grid: rgba(255, 255, 255, 0.08);
  --cb-text: #f5f5f5;
  --cb-accent: #f97316;

  --cb-sticky-yellow: #ffd95e;
  --cb-sticky-pink:   #ff9bb3;
  --cb-sticky-blue:   #8ec5ff;
  --cb-sticky-green:  #a8e063;
  --cb-sticky-purple: #c4a7ff;

  --cb-sticky-font: 'Caveat', 'Bradley Hand', cursive;
}
```

All class names are prefixed `cb-` to avoid collisions.

## Customization

The canvas is fully composable. Every default surface (toolbar, context menu,
the sticky note itself) is a plug-in you can replace, and there are six
overlay slots for dropping your own chrome anywhere on the board.

### Easy default

```tsx
import { CasmaBoard } from '@casmadev/board';
import '@casmadev/board/styles.css';

<CasmaBoard />
// ↑ sticky note + default toolbar in bottom-center. Nothing to wire up.
```

### Custom shape kinds

A shape kind is a small object describing how to create + render one shape
type. Pass an array of them to `shapeKinds`:

```tsx
import {
  CasmaBoard,
  defaultShapeKinds,
} from '@casmadev/board';
import type { ShapeKind, ShapeRenderProps } from '@casmadev/board';

interface BoxShape {
  id: string;
  type: 'box';
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

function BoxRenderer({ shape, pointerHandlers, onSelect }: ShapeRenderProps<BoxShape>) {
  return (
    <div
      data-shape-id={shape.id}      // required: identifies this DOM node as a shape
      style={{ position: 'absolute', left: shape.x, top: shape.y, width: shape.w, height: shape.h, background: 'tomato' }}
      tabIndex={0}
      onFocus={onSelect}
      {...pointerHandlers}            // wire drag + select
    >
      {shape.label}
    </div>
  );
}

const boxKind: ShapeKind<BoxShape> = {
  type: 'box',
  defaultSize: { w: 140, h: 80 },
  create: (id, x, y) => ({ id, type: 'box', x: x - 70, y: y - 40, w: 140, h: 80, label: 'Box' }),
  Component: BoxRenderer,
  toolButton: { icon: <BoxIcon />, label: 'Box' },   // optional: registers a toolbar button
};

<CasmaBoard shapeKinds={[...defaultShapeKinds, boxKind]} />
```

Your renderer receives `selected`, `editing`, `editVersion`, `patch`,
`onSelect`, `onStartEdit`, `onCommitEdit`, `onCancelEdit` — everything you
need to participate in the board's lifecycle. The board itself never reads
your shape's extra fields; you own how they're stored and rendered.

### Slots

Six fixed overlays anchored over the viewport. Each accepts any `ReactNode`.
The wrapper is transparent to pointer events; only your content captures
clicks.

```tsx
<CasmaBoard
  slots={{
    topLeft:     <MyTitleBar />,
    topCenter:   <MyBreadcrumbs />,
    topRight:    <MyZoomReadout />,
    bottomLeft:  <MyStatusChip />,
    bottomCenter: <MyCustomToolbar />,  // overrides the DefaultToolbar
    bottomRight: <MySelectionInspector />,
  }}
/>
```

The default toolbar lives in `bottomCenter`. Three ways to control it:

1. **Default behavior.** Omit `slots.bottomCenter` → `DefaultToolbar` is rendered.
2. **Replace it.** Pass any node into `slots.bottomCenter`.
3. **Suppress it.** Pass `slots={{ bottomCenter: null }}` to leave the slot empty.

Custom slot content can drive the board via the `useCasmaBoard()` hook:

```tsx
import { useCasmaBoard } from '@casmadev/board';

function ZoomReadout() {
  const { camera, setCamera } = useCasmaBoard();
  return (
    <button onClick={() => setCamera(c => ({ ...c, zoom: 1 }))}>
      {Math.round(camera.zoom * 100)}%
    </button>
  );
}
```

The hook returns `tool`, `setTool`, `camera`, `setCamera`, `shapes`,
`setShapes`, `shapeKinds`, `messages`, `direction`, `selectedId`,
`selectedShape`, `setSelectedId`, `editingId`, `setEditingId`, `patchShape`,
`removeShape`, `addShape`, and `viewportRef`.

### Custom context menu

Override the per-shape context menu with a single render function. It's
called whenever a shape is selected (and not being edited) — branch on
`shape.type` to handle each kind.

```tsx
<CasmaBoard
  contextMenu={({ shape, camera, patch, remove }) => (
    <div style={{ position: 'absolute', left: 0, top: 0 }} onPointerDown={e => e.stopPropagation()}>
      <button onClick={remove}>Delete {shape.type}</button>
    </div>
  )}
/>
```

`DefaultContextMenu` is exported too — wrap it, delegate to it, or copy the
source as a starting point.

### Composable defaults

Every default surface is exported individually so you can mix-and-match:

```ts
import {
  DefaultToolbar,           // bottom-center tool picker
  DefaultContextMenu,       // sticky color picker + delete
  ColorPicker,              // sticky color swatches
  stickyKind,               // the built-in sticky ShapeKind
  defaultShapeKinds,        // [stickyKind]
  StickyNote, StickyIcon,   // sticky's renderer + icon
} from '@casmadev/board';
```

## Behavior summary

- **Pan:** middle-mouse drag, `Space` + primary drag, or two-finger trackpad scroll.
- **Zoom:** `Cmd`/`Ctrl` + wheel (macOS pinch arrives as ctrl-wheel). Anchors at the cursor.
- **Sticky tool → click canvas:** drops a new note at the cursor.
- **Double-click sticky:** edit in place. The note lifts off the canvas with a smooth transition and the rotation rerolls slightly when you click away — like picking it up and putting it back.
- **Selected sticky:** context menu pops up under the note with color swatches and the trash button.
- **Wheel over editing text:** scrolls the text instead of panning the canvas.
- **Delete:** `Backspace` / `Delete` on the selected shape, or the trash button.

## Development

```sh
git clone …
npm install
npm run dev          # boots the Vite playground at http://localhost:5173
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run build        # rollup → dist/
```

The playground (`examples/playground/`) aliases `@casmadev/board` to the
source so HMR hits TypeScript directly — no rebuild loop.

## License

MIT
