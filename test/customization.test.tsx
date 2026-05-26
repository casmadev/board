import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CasmaBoard } from '../src/CasmaBoard';
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
