import '@testing-library/jest-dom/vitest';

// jsdom doesn't ship a ResizeObserver. The sticky renderer wires one up
// while editing to track scroll metrics, which crashes any test that
// triggers a sticky into edit mode. A no-op stub is enough — nothing in
// tests depends on it actually firing callbacks.
if (typeof globalThis.ResizeObserver === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
