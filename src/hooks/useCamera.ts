import type { Camera } from '../types';
import { useControllable } from './useControllable';

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

export function useCamera(
  value: Camera | undefined,
  defaultValue: Camera | undefined,
  onChange?: (next: Camera) => void,
) {
  return useControllable<Camera>(value, defaultValue ?? DEFAULT_CAMERA, onChange);
}
