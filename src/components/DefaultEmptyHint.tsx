import { useCasmaBoard } from '../context';

/**
 * Default content of the `center` slot. Renders the localized
 * "click to add a note" hint when the board is empty, and nothing once any
 * shape exists. Exported so consumers can wrap or delegate to it from their
 * own custom `slots.center` content.
 */
export function DefaultEmptyHint() {
  const { shapes, messages } = useCasmaBoard();
  if (shapes.order.length > 0) return null;
  return <div className="cb-empty-hint">{messages.hints.emptyCanvas}</div>;
}
