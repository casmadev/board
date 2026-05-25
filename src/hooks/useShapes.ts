import type { ShapesState } from '../types';
import { emptyShapes } from '../state/reducer';
import { useControllable } from './useControllable';

export function useShapes(
  value: ShapesState | undefined,
  defaultValue: ShapesState | undefined,
  onChange?: (next: ShapesState) => void,
) {
  return useControllable<ShapesState>(value, defaultValue ?? emptyShapes, onChange);
}
