import type { Camera } from '../types';
import { ZOOM_MAX, ZOOM_MIN } from '../constants';

export interface Point {
  x: number;
  y: number;
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function screenToWorld(camera: Camera, screen: Point): Point {
  return {
    x: (screen.x - camera.x) / camera.zoom,
    y: (screen.y - camera.y) / camera.zoom,
  };
}

export function worldToScreen(camera: Camera, world: Point): Point {
  return {
    x: world.x * camera.zoom + camera.x,
    y: world.y * camera.zoom + camera.y,
  };
}

/**
 * Zoom so the given screen-space anchor point stays over the same world point.
 */
export function zoomAtPoint(
  camera: Camera,
  nextZoomRaw: number,
  anchor: Point,
): Camera {
  const nextZoom = clampZoom(nextZoomRaw);
  if (nextZoom === camera.zoom) return camera;
  const world = screenToWorld(camera, anchor);
  return {
    zoom: nextZoom,
    x: anchor.x - world.x * nextZoom,
    y: anchor.y - world.y * nextZoom,
  };
}
