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
| `hideUI` | `boolean` | `false` | Hide the bottom tool picker and per-shape context menu. |
| `generateId` | `() => string` | `crypto.randomUUID` | Inject a deterministic id generator (useful for SSR / tests). |
| `className`, `style` | — | — | Passed to the root container. |

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
