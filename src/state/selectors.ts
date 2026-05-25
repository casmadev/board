import type { Shape, ShapesState } from '../types';

export function getOrderedShapes(state: ShapesState): Shape[] {
  const out: Shape[] = [];
  for (const id of state.order) {
    const shape = state.shapes[id];
    if (shape) out.push(shape);
  }
  return out;
}
