import { describe, expect, it } from 'vitest';
import {
  addShape,
  bringToFront,
  createStickyShape,
  deleteShape,
  emptyShapes,
  moveShape,
  setStickyColor,
  setStickyText,
} from '../src/state/reducer';
import { DEFAULT_STICKY_SIZE } from '../src/constants';

describe('reducer', () => {
  it('adds a sticky note centered on its origin', () => {
    const sticky = createStickyShape('a', 100, 100);
    const next = addShape(emptyShapes, sticky);
    expect(next.shapes['a']).toBeDefined();
    expect(next.order).toEqual(['a']);
    // origin should be (100,100) − half size
    expect(sticky.x).toBe(100 - DEFAULT_STICKY_SIZE.w / 2);
    expect(sticky.y).toBe(100 - DEFAULT_STICKY_SIZE.h / 2);
  });

  it('does nothing when adding an existing id', () => {
    const sticky = createStickyShape('a', 0, 0);
    const a = addShape(emptyShapes, sticky);
    const b = addShape(a, sticky);
    expect(b).toBe(a);
  });

  it('moves a shape relative to its current position', () => {
    const sticky = createStickyShape('a', 100, 100);
    const a = addShape(emptyShapes, sticky);
    const moved = moveShape(a, 'a', 50, 25);
    expect(moved.shapes['a']?.x).toBe(sticky.x + 50);
    expect(moved.shapes['a']?.y).toBe(sticky.y + 25);
  });

  it('changes sticky color', () => {
    const sticky = createStickyShape('a', 0, 0);
    const a = addShape(emptyShapes, sticky);
    const recolored = setStickyColor(a, 'a', 'blue');
    expect((recolored.shapes['a'] as typeof sticky).color).toBe('blue');
  });

  it('updates sticky text', () => {
    const sticky = createStickyShape('a', 0, 0);
    const a = addShape(emptyShapes, sticky);
    const edited = setStickyText(a, 'a', 'hello');
    expect((edited.shapes['a'] as typeof sticky).text).toBe('hello');
  });

  it('deletes a shape and removes it from order', () => {
    const a = addShape(emptyShapes, createStickyShape('a', 0, 0));
    const b = addShape(a, createStickyShape('b', 10, 10));
    const deleted = deleteShape(b, 'a');
    expect(deleted.shapes['a']).toBeUndefined();
    expect(deleted.order).toEqual(['b']);
  });

  it('brings a shape to the front', () => {
    const a = addShape(emptyShapes, createStickyShape('a', 0, 0));
    const b = addShape(a, createStickyShape('b', 0, 0));
    const c = addShape(b, createStickyShape('c', 0, 0));
    const reordered = bringToFront(c, 'a');
    expect(reordered.order).toEqual(['b', 'c', 'a']);
  });
});
