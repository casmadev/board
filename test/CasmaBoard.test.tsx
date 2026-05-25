import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CasmaBoard } from '../src/CasmaBoard';
import { es } from '../src/locales/es';

describe('<CasmaBoard />', () => {
  it('renders the empty-state hint in English by default', () => {
    render(<CasmaBoard />);
    expect(
      screen.getByText(/Pick the sticky-note tool/i),
    ).toBeInTheDocument();
  });

  it('localizes toolbar buttons via messages prop', () => {
    render(<CasmaBoard messages={es} />);
    expect(screen.getByRole('button', { name: 'Nota adhesiva' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seleccionar' })).toBeInTheDocument();
  });

  it('sets dir="rtl" when direction is rtl', () => {
    const { container } = render(<CasmaBoard direction="rtl" />);
    const root = container.querySelector('.cb-root');
    expect(root?.getAttribute('dir')).toBe('rtl');
  });

  it('switches tools when toolbar buttons are clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<CasmaBoard />);
    const stickyButton = screen.getByRole('button', { name: /sticky note/i });
    await user.click(stickyButton);
    const root = container.querySelector('.cb-root');
    expect(root?.getAttribute('data-tool')).toBe('sticky');
  });

  it('supports a controlled shapes prop', () => {
    const onChange = vi.fn();
    render(
      <CasmaBoard
        shapes={{
          shapes: {
            a: {
              id: 'a',
              type: 'sticky',
              x: 0,
              y: 0,
              w: 100,
              h: 100,
              text: 'hello world',
              color: 'pink',
            },
          },
          order: ['a'],
        }}
        onShapesChange={onChange}
      />,
    );
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });
});
