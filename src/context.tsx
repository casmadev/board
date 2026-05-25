import { createContext, useContext } from 'react';
import type { BoardContextValue } from './types';

/**
 * React context exposing the live board state + mutators. Custom UI rendered
 * into a slot (or anywhere inside the `<CasmaBoard>` subtree) can read or
 * change tool/selection/camera/shapes via `useCasmaBoard()`.
 *
 * `null` outside a board — the hook throws a clearer message than the default
 * undefined-destructure crash.
 */
export const BoardContext = createContext<BoardContextValue | null>(null);

/**
 * Hook returning the surrounding `<CasmaBoard>`'s context value. Use it from
 * custom slot content (toolbars, status bars, action buttons) to read live
 * state or drive the board.
 *
 * Throws if called outside a `<CasmaBoard>` — the only way that happens is a
 * developer mistake, and the explicit error is much friendlier than the
 * crash you'd get destructuring `null`.
 */
export function useCasmaBoard(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) {
    throw new Error(
      'useCasmaBoard() must be called from inside a <CasmaBoard>. Pass your ' +
        'custom UI as a slot prop, or render it as a child of <CasmaBoard>.',
    );
  }
  return ctx;
}
