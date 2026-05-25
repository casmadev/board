import { useCallback, useRef, useState } from 'react';

/**
 * Resolves a controlled-or-uncontrolled value. If `value` is provided, the
 * hook is in controlled mode and `onChange` is called for every update. Else,
 * it falls back to internal state seeded with `defaultValue`.
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T | ((prev: T) => T)) => void] {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<T>(defaultValue);
  const currentRef = useRef<T>(isControlled ? (value as T) : internal);
  currentRef.current = isControlled ? (value as T) : internal;

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: T) => T)(currentRef.current)
          : next;
      if (!isControlled) setInternal(resolved);
      onChange?.(resolved);
      currentRef.current = resolved;
    },
    [isControlled, onChange],
  );

  return [currentRef.current, set];
}
