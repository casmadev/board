import type { ReactNode } from 'react';
import type { Slots } from '../types';

/**
 * Renders any provided slot content into six fixed overlays anchored to the
 * viewport corners + edges. Each slot is a transparent wrapper (`pointer-events: none`)
 * so the canvas underneath still receives gestures; the wrapper's children
 * opt back in via `pointer-events: auto`.
 *
 * Empty slots render nothing — no stray overlay div left behind to absorb
 * stray events.
 */
export function SlotOverlays({ slots }: { slots: Slots }) {
  return (
    <>
      <Slot position="top-left" content={slots.topLeft} />
      <Slot position="top-center" content={slots.topCenter} />
      <Slot position="top-right" content={slots.topRight} />
      <Slot position="center" content={slots.center} />
      <Slot position="bottom-left" content={slots.bottomLeft} />
      <Slot position="bottom-center" content={slots.bottomCenter} />
      <Slot position="bottom-right" content={slots.bottomRight} />
    </>
  );
}

interface SlotProps {
  position:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  content: ReactNode;
}

function Slot({ position, content }: SlotProps) {
  if (content == null || content === false) return null;
  return <div className={`cb-slot cb-slot--${position}`}>{content}</div>;
}
