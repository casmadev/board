import type { DeepPartial } from '../types';

export interface Messages {
  toolbar: {
    select: string;
    stickyNote: string;
    delete: string;
  };
  colors: {
    yellow: string;
    pink: string;
    blue: string;
    green: string;
    purple: string;
  };
  aria: {
    canvas: string;
    sticky: string;
    colorPicker: string;
    deleteShape: string;
    zoomIn: string;
    zoomOut: string;
    zoomReset: string;
  };
  hints: {
    emptyCanvas: string;
  };
}

export const defaultMessages: Messages = {
  toolbar: {
    select: 'Select',
    stickyNote: 'Sticky note',
    delete: 'Delete',
  },
  colors: {
    yellow: 'Yellow',
    pink: 'Pink',
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
  },
  aria: {
    canvas: 'Whiteboard canvas',
    sticky: 'Sticky note',
    colorPicker: 'Sticky note color',
    deleteShape: 'Delete selected shape',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom to 100%',
  },
  hints: {
    emptyCanvas: 'Pick the sticky-note tool and click anywhere to add a note.',
  },
};

export function mergeMessages(
  base: Messages,
  override?: DeepPartial<Messages>,
): Messages {
  if (!override) return base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base) as Array<keyof Messages>) {
    const baseSection = base[key];
    const overrideSection = override[key];
    if (overrideSection && typeof baseSection === 'object') {
      out[key] = { ...baseSection, ...overrideSection };
    }
  }
  return out as unknown as Messages;
}
