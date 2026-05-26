import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CasmaBoard } from '../src/CasmaBoard';
import { DefaultToolbar } from '../src/components/DefaultToolbar';
import { useCasmaBoard } from '../src/context';
import { stickyKind } from '../src/kinds/sticky';
import type { ShapeKind, ShapeRenderProps, StickyShape } from '../src/types';

describe('CasmaBoard customization', () => {
  describe('slots', () => {
    it('renders content into the six named slots', () => {
      render(
        <CasmaBoard
          slots={{
            topLeft: <div data-testid="tl">TL</div>,
            topCenter: <div data-testid="tc">TC</div>,
            topRight: <div data-testid="tr">TR</div>,
            bottomLeft: <div data-testid="bl">BL</div>,
            bottomCenter: <div data-testid="bc">BC</div>,
            bottomRight: <div data-testid="br">BR</div>,
          }}
        />,
      );
      // Each slot wrapper carries the position modifier so layout can
      // be verified in CSS.
      const tl = screen.getByTestId('tl').parentElement!;
      expect(tl.classList.contains('cb-slot--top-left')).toBe(true);
      const bc = screen.getByTestId('bc').parentElement!;
      expect(bc.classList.contains('cb-slot--bottom-center')).toBe(true);
      const br = screen.getByTestId('br').parentElement!;
      expect(br.classList.contains('cb-slot--bottom-right')).toBe(true);
    });

    it('omits empty slot wrappers entirely', () => {
      const { container } = render(<CasmaBoard slots={{ topLeft: <div>x</div> }} />);
      // 1 consumer slot + 3 defaults (bottomCenter toolbar, bottomRight zoom,
      // center empty hint). Empty/unused slots emit no wrapper at all.
      const slots = container.querySelectorAll('.cb-slot');
      expect(slots.length).toBe(4);
    });

    it('replaces the default toolbar when bottomCenter is provided', () => {
      render(
        <CasmaBoard
          slots={{ bottomCenter: <div data-testid="custom-toolbar">custom</div> }}
        />,
      );
      expect(screen.getByTestId('custom-toolbar')).toBeInTheDocument();
      // The default toolbar's sticky-note button is not in the DOM anymore.
      expect(
        screen.queryByRole('button', { name: /sticky note/i }),
      ).not.toBeInTheDocument();
    });

    it('suppresses the default toolbar when bottomCenter is explicitly null', () => {
      const { container } = render(
        <CasmaBoard slots={{ bottomCenter: null }} />,
      );
      // No bottom-center slot rendered at all.
      expect(container.querySelector('.cb-slot--bottom-center')).toBeNull();
    });

    it('suppresses every default UI surface when hideUI is true', () => {
      const { container } = render(
        <CasmaBoard
          hideUI
          slots={{ topLeft: <div>still here</div> }}
        />,
      );
      // hideUI nukes slots too — slot bag short-circuits.
      expect(container.querySelectorAll('.cb-slot').length).toBe(0);
    });
  });

  describe('contextMenu prop', () => {
    it('renders the custom context menu when a shape is selected', async () => {
      const user = userEvent.setup();
      render(
        <CasmaBoard
          defaultShapes={{
            shapes: {
              a: {
                id: 'a',
                type: 'sticky',
                x: 0,
                y: 0,
                w: 100,
                h: 100,
                text: 'hi',
                color: 'yellow',
              } as StickyShape,
            },
            order: ['a'],
          }}
          contextMenu={({ shape, remove }) => (
            <div
              data-testid="ctx"
              style={{ position: 'absolute' }}
              // Same pattern DefaultContextMenu uses — without it, the
              // pointerdown bubbles to the viewport, deselects the shape,
              // and the menu unmounts before click fires.
              onPointerDown={(e) => e.stopPropagation()}
            >
              {shape.id}
              <button onClick={remove}>kill it</button>
            </div>
          )}
        />,
      );
      // Focus the sticky to trigger selection. Wrapped in act() because
      // the focus handler fires a setState (selectedId) synchronously.
      const sticky = document.querySelector(
        '[data-shape-id="a"]',
      ) as HTMLElement;
      act(() => {
        sticky.focus();
      });
      const menu = await screen.findByTestId('ctx');
      expect(menu).toHaveTextContent('a');
      await user.click(screen.getByRole('button', { name: 'kill it' }));
      expect(document.querySelector('[data-shape-id="a"]')).toBeNull();
    });
  });

  describe('custom shape kinds', () => {
    interface BoxShape {
      id: string;
      type: 'box';
      x: number;
      y: number;
      w: number;
      h: number;
      label: string;
    }

    const BoxRenderer = ({ shape, pointerHandlers }: ShapeRenderProps<BoxShape>) => (
      <div
        data-shape-id={shape.id}
        data-testid={`box-${shape.id}`}
        style={{
          position: 'absolute',
          left: shape.x,
          top: shape.y,
          width: shape.w,
          height: shape.h,
          background: 'tomato',
        }}
        {...pointerHandlers}
      >
        {shape.label}
      </div>
    );

    const boxKind: ShapeKind<BoxShape> = {
      type: 'box',
      defaultSize: { w: 80, h: 60 },
      create: (id, x, y) => ({
        id,
        type: 'box',
        x: x - 40,
        y: y - 30,
        w: 80,
        h: 60,
        label: 'box!',
      }),
      Component: BoxRenderer,
      toolButton: {
        icon: <span data-testid="box-icon">B</span>,
        label: 'Box',
      },
    };

    it('renders a default-shapes box via the custom kind renderer', () => {
      render(
        <CasmaBoard
          shapeKinds={[boxKind]}
          defaultShapes={{
            shapes: {
              x: {
                id: 'x',
                type: 'box',
                x: 0,
                y: 0,
                w: 80,
                h: 60,
                label: 'first',
              } as BoxShape,
            },
            order: ['x'],
          }}
        />,
      );
      expect(screen.getByTestId('box-x')).toHaveTextContent('first');
    });

    it('registers a toolbar button for kinds with toolButton', () => {
      render(<CasmaBoard shapeKinds={[boxKind]} />);
      expect(screen.getByTestId('box-icon')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /sticky note/i }),
      ).not.toBeInTheDocument(); // sticky kind not registered
    });

    it('keeps sticky working when both kinds are registered', () => {
      render(<CasmaBoard shapeKinds={[stickyKind, boxKind]} />);
      expect(screen.getByRole('button', { name: /sticky note/i })).toBeInTheDocument();
      expect(screen.getByTestId('box-icon')).toBeInTheDocument();
    });

    it('creates a shape when the user drags from the toolbar onto the canvas', async () => {
      render(<CasmaBoard shapeKinds={[boxKind]} />);
      const toolBtn = screen.getByRole('button', { name: 'Box' });
      // The viewport is whatever cb-viewport sits behind the toolbar.
      const viewport = document.querySelector('.cb-viewport') as HTMLElement;
      // Stub viewport bounds — jsdom gives every element a 0×0 rect, which
      // would make "released over viewport" always false. Pretending it's
      // a 1000×800 region at (0,0) is enough for the gesture math.
      viewport.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
          x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

      const user = userEvent.setup();
      // pointerdown on the toolbar button → setTool + start tracking.
      await user.pointer({ keys: '[MouseLeft>]', target: toolBtn });
      expect(document.querySelector('[data-shape-id]')).toBeNull(); // no shape yet
      // Drag past the 4px threshold and over the viewport, then release.
      await user.pointer({ coords: { x: 400, y: 300 } });
      await user.pointer({ keys: '[/MouseLeft]', coords: { x: 400, y: 300 } });

      const box = document.querySelector('[data-shape-id]') as HTMLElement;
      expect(box).not.toBeNull();
      // boxKind centers the shape on the world point (x − w/2, y − h/2)
      // with w=80, h=60. Release at (400, 300) → box at (360, 270).
      expect(box.style.left).toBe('360px');
      expect(box.style.top).toBe('270px');
    });

    it('does not create a shape when a toolbar tap is released without drag', async () => {
      render(<CasmaBoard shapeKinds={[boxKind]} />);
      const toolBtn = screen.getByRole('button', { name: 'Box' });
      const user = userEvent.setup();
      // Tap (no movement past threshold) — should only set the tool.
      await user.pointer({ keys: '[MouseLeft>]', target: toolBtn });
      await user.pointer({ keys: '[/MouseLeft]', target: toolBtn });
      expect(document.querySelector('[data-shape-id]')).toBeNull();
      // And the tool is now Box; aria-pressed reflects it.
      expect(toolBtn.getAttribute('aria-pressed')).toBe('true');
    });

    it('DefaultToolbar `clickToCreate` spawns a shape at the viewport center on click', async () => {
      render(
        <CasmaBoard
          shapeKinds={[boxKind]}
          slots={{ bottomCenter: <DefaultToolbar clickToCreate /> }}
        />,
      );
      const viewport = document.querySelector('.cb-viewport') as HTMLElement;
      // Stub viewport to a known 1000×800 rect at the origin.
      viewport.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
          x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const toolBtn = screen.getByRole('button', { name: 'Box' });
      // Kind button should not advertise selection state in this mode.
      expect(toolBtn.getAttribute('aria-pressed')).toBeNull();

      await userEvent.setup().click(toolBtn);

      const box = document.querySelector('[data-shape-id]') as HTMLElement;
      expect(box).not.toBeNull();
      // Viewport center is (500, 400). boxKind centers (80, 60) on the
      // world point → (500 − 40, 400 − 30) = (460, 370). Camera is at the
      // identity so screen == world.
      expect(box.style.left).toBe('460px');
      expect(box.style.top).toBe('370px');
    });

    it('renders a preview shape under the cursor during drag-from-toolbar', async () => {
      // stickyKind spreads the board-provided className onto its root, so
      // the cb-shape--preview modifier (which paints the 40% opacity) lands
      // on the rendered element. The playground BoxRenderer in this file
      // intentionally doesn't apply className, so it's the wrong fixture
      // for this test.
      render(<CasmaBoard />); // defaults to [stickyKind]
      const viewport = document.querySelector('.cb-viewport') as HTMLElement;
      viewport.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
          x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const toolBtn = screen.getByRole('button', { name: /sticky note/i });

      const user = userEvent.setup();
      await user.pointer({ keys: '[MouseLeft>]', target: toolBtn });
      await user.pointer({ coords: { x: 400, y: 300 } });

      const preview = document.querySelector('.cb-shape--preview') as HTMLElement;
      expect(preview).not.toBeNull();
      // Position tracks the cursor. Sticky is centered on the world point
      // (x − w/2, y − h/2) with the default 192×192 size, so a release at
      // world (400, 300) puts the shape at (304, 204).
      expect(preview.style.left).toBe('304px');
      expect(preview.style.top).toBe('204px');
      // No real shape on the board yet (preview ≠ committed).
      const realShapes = Array.from(
        document.querySelectorAll('[data-shape-id]'),
      ).filter((el) => !el.classList.contains('cb-shape--preview'));
      expect(realShapes.length).toBe(0);

      // Release over the viewport → commit. Preview clears, real shape lands.
      await user.pointer({ keys: '[/MouseLeft]', coords: { x: 400, y: 300 } });
      expect(document.querySelector('.cb-shape--preview')).toBeNull();
      const committed = document.querySelector('[data-shape-id]') as HTMLElement;
      expect(committed).not.toBeNull();
      expect(committed.style.left).toBe('304px');
      expect(committed.style.top).toBe('204px');
    });

    it('cancels the drag-from-toolbar gesture on Escape (no shape created)', async () => {
      render(<CasmaBoard />);
      const viewport = document.querySelector('.cb-viewport') as HTMLElement;
      viewport.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
          x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const toolBtn = screen.getByRole('button', { name: /sticky note/i });

      const user = userEvent.setup();
      await user.pointer({ keys: '[MouseLeft>]', target: toolBtn });
      await user.pointer({ coords: { x: 400, y: 300 } });
      expect(document.querySelector('.cb-shape--preview')).not.toBeNull();

      await user.keyboard('{Escape}');
      expect(document.querySelector('.cb-shape--preview')).toBeNull();
      // Release left so userEvent's internal pointer state stays balanced.
      await user.pointer({ keys: '[/MouseLeft]', coords: { x: 400, y: 300 } });
      expect(document.querySelector('[data-shape-id]')).toBeNull();
    });

    it('cancels the drag-from-toolbar gesture on right-click (no shape created)', async () => {
      render(<CasmaBoard />);
      const viewport = document.querySelector('.cb-viewport') as HTMLElement;
      viewport.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
          x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const toolBtn = screen.getByRole('button', { name: /sticky note/i });

      const user = userEvent.setup();
      await user.pointer({ keys: '[MouseLeft>]', target: toolBtn });
      await user.pointer({ coords: { x: 400, y: 300 } });
      expect(document.querySelector('.cb-shape--preview')).not.toBeNull();

      // Right-click while holding left → cancel. jsdom doesn't expose
      // `PointerEvent` globally, but the handler only reads MouseEvent
      // fields (button / clientX / clientY) so a MouseEvent dispatched
      // under the 'pointerdown' type fires the listener correctly. Wrap
      // in act() so the React state update from setDragPreview(null)
      // commits before the assertion below.
      act(() => {
        document.dispatchEvent(new MouseEvent('pointerdown', {
          bubbles: true, cancelable: true,
          button: 2, buttons: 3,
          clientX: 400, clientY: 300,
        }));
      });
      expect(document.querySelector('.cb-shape--preview')).toBeNull();
      await user.pointer({ keys: '[/MouseLeft]', coords: { x: 400, y: 300 } });
      expect(document.querySelector('[data-shape-id]')).toBeNull();
    });

    it('DefaultToolbar `dragToCreate={false}` disables the drag-from-toolbar shortcut', async () => {
      render(
        <CasmaBoard
          shapeKinds={[boxKind]}
          slots={{ bottomCenter: <DefaultToolbar dragToCreate={false} /> }}
        />,
      );
      const viewport = document.querySelector('.cb-viewport') as HTMLElement;
      viewport.getBoundingClientRect = () =>
        ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800,
          x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const toolBtn = screen.getByRole('button', { name: 'Box' });

      const user = userEvent.setup();
      await user.pointer({ keys: '[MouseLeft>]', target: toolBtn });
      await user.pointer({ coords: { x: 400, y: 300 } });
      await user.pointer({ keys: '[/MouseLeft]', coords: { x: 400, y: 300 } });

      // Drag is a no-op when the prop is off; no shape was created. The
      // tap still selected the tool (existing two-step flow intact).
      expect(document.querySelector('[data-shape-id]')).toBeNull();
      expect(toolBtn.getAttribute('aria-pressed')).toBe('true');
    });

    it('passes a cb-shape className that reflects selected / dragging state', async () => {
      // Renderer that spreads the board-provided className. This is the
      // recommended pattern — custom kinds opt into the shared cursor,
      // selection ring, z-lift, and grabbing cursor via this one prop.
      const ClassedBox = ({ shape, pointerHandlers, className }: ShapeRenderProps<BoxShape>) => (
        <div
          data-shape-id={shape.id}
          data-testid={`box-${shape.id}`}
          className={className}
          style={{
            left: shape.x,
            top: shape.y,
            width: shape.w,
            height: shape.h,
            background: 'tomato',
          }}
          {...pointerHandlers}
        />
      );
      const classedKind: ShapeKind<BoxShape> = { ...boxKind, Component: ClassedBox };
      render(
        <CasmaBoard
          shapeKinds={[classedKind]}
          defaultShapes={{
            shapes: {
              x: {
                id: 'x',
                type: 'box',
                x: 0,
                y: 0,
                w: 80,
                h: 60,
                label: 'b',
              } as BoxShape,
            },
            order: ['x'],
          }}
        />,
      );
      const box = screen.getByTestId('box-x');
      // Baseline: cb-shape applied, no state modifiers yet.
      expect(box.className).toBe('cb-shape');

      // Pointerdown selects → cb-shape--selected appears.
      const user = userEvent.setup();
      await user.pointer({ keys: '[MouseLeft>]', target: box });
      expect(box.className).toContain('cb-shape--selected');
      expect(box.className).not.toContain('cb-shape--dragging');

      // Move past the 4px threshold → cb-shape--dragging is added.
      await user.pointer({ coords: { x: 50, y: 50 } });
      expect(box.className).toContain('cb-shape--dragging');

      // Release → dragging clears, selection persists.
      await user.pointer({ keys: '[/MouseLeft]' });
      expect(box.className).not.toContain('cb-shape--dragging');
      expect(box.className).toContain('cb-shape--selected');
    });
  });

  describe('useCasmaBoard hook', () => {
    function ToolReadout() {
      const { tool, setTool } = useCasmaBoard();
      return (
        <div>
          <span data-testid="tool">{tool}</span>
          <button onClick={() => setTool('sticky')}>activate sticky</button>
        </div>
      );
    }

    it('exposes tool state to slot content', async () => {
      const user = userEvent.setup();
      render(
        <CasmaBoard slots={{ topRight: <ToolReadout /> }} />,
      );
      expect(screen.getByTestId('tool')).toHaveTextContent('select');
      await user.click(
        screen.getByRole('button', { name: 'activate sticky' }),
      );
      expect(screen.getByTestId('tool')).toHaveTextContent('sticky');
    });

    it('throws a clear error when called outside <CasmaBoard>', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<ToolReadout />)).toThrow(/inside a <CasmaBoard>/);
      errSpy.mockRestore();
    });
  });
});
