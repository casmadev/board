import type { Shape, ShapesState, StickyColor, StickyShape } from '../types';
import { DEFAULT_STICKY_COLOR, DEFAULT_STICKY_SIZE } from '../constants';

export const emptyShapes: ShapesState = { shapes: {}, order: [] };

export function createStickyShape(
  id: string,
  x: number,
  y: number,
  init?: Partial<Pick<StickyShape, 'text' | 'color' | 'w' | 'h'>>,
): StickyShape {
  return {
    id,
    type: 'sticky',
    x: x - DEFAULT_STICKY_SIZE.w / 2,
    y: y - DEFAULT_STICKY_SIZE.h / 2,
    w: init?.w ?? DEFAULT_STICKY_SIZE.w,
    h: init?.h ?? DEFAULT_STICKY_SIZE.h,
    text: init?.text ?? '',
    color: init?.color ?? DEFAULT_STICKY_COLOR,
  };
}

export function addShape(state: ShapesState, shape: Shape): ShapesState {
  if (state.shapes[shape.id]) return state;
  return {
    shapes: { ...state.shapes, [shape.id]: shape },
    order: [...state.order, shape.id],
  };
}

export function updateShape<T extends Shape>(
  state: ShapesState,
  id: string,
  patch: Partial<T>,
): ShapesState {
  const existing = state.shapes[id];
  if (!existing) return state;
  const next = { ...existing, ...patch } as Shape;
  return { ...state, shapes: { ...state.shapes, [id]: next } };
}

export function moveShape(
  state: ShapesState,
  id: string,
  dx: number,
  dy: number,
): ShapesState {
  const existing = state.shapes[id];
  if (!existing) return state;
  return updateShape(state, id, { x: existing.x + dx, y: existing.y + dy });
}

export function setStickyColor(
  state: ShapesState,
  id: string,
  color: StickyColor,
): ShapesState {
  const existing = state.shapes[id];
  if (!existing || existing.type !== 'sticky') return state;
  return updateShape<StickyShape>(state, id, { color });
}

export function setStickyText(
  state: ShapesState,
  id: string,
  text: string,
): ShapesState {
  const existing = state.shapes[id];
  if (!existing || existing.type !== 'sticky') return state;
  return updateShape<StickyShape>(state, id, { text });
}

export function deleteShape(state: ShapesState, id: string): ShapesState {
  if (!state.shapes[id]) return state;
  const nextShapes = { ...state.shapes };
  delete nextShapes[id];
  return {
    shapes: nextShapes,
    order: state.order.filter((x) => x !== id),
  };
}

export function bringToFront(state: ShapesState, id: string): ShapesState {
  if (!state.shapes[id]) return state;
  if (state.order[state.order.length - 1] === id) return state;
  return {
    ...state,
    order: [...state.order.filter((x) => x !== id), id],
  };
}
