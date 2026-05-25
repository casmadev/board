import { describe, expect, it } from 'vitest';
import {
  clampZoom,
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
} from '../src/geometry/camera';
import { ZOOM_MAX, ZOOM_MIN } from '../src/constants';

describe('camera geometry', () => {
  it('clampZoom enforces bounds', () => {
    expect(clampZoom(0)).toBe(ZOOM_MIN);
    expect(clampZoom(1000)).toBe(ZOOM_MAX);
    expect(clampZoom(2)).toBe(2);
  });

  it('screenToWorld is the inverse of worldToScreen', () => {
    const camera = { x: 50, y: -20, zoom: 1.5 };
    const world = { x: 200, y: 300 };
    const screen = worldToScreen(camera, world);
    const back = screenToWorld(camera, screen);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it('zoomAtPoint keeps the cursor anchor stable', () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    const anchor = { x: 300, y: 200 };
    const beforeWorld = screenToWorld(camera, anchor);
    const next = zoomAtPoint(camera, 2, anchor);
    const afterWorld = screenToWorld(next, anchor);
    expect(afterWorld.x).toBeCloseTo(beforeWorld.x);
    expect(afterWorld.y).toBeCloseTo(beforeWorld.y);
    expect(next.zoom).toBe(2);
  });

  it('zoomAtPoint clamps and is a no-op when zoom does not change', () => {
    const camera = { x: 10, y: 20, zoom: ZOOM_MAX };
    const next = zoomAtPoint(camera, ZOOM_MAX * 10, { x: 0, y: 0 });
    expect(next).toBe(camera);
  });
});
