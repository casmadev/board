import { useCallback, useEffect, useRef } from 'react';
import type { Camera } from '../types';
import { ZOOM_WHEEL_STEP } from '../constants';
import { clampZoom, zoomAtPoint } from '../geometry/camera';

interface Options {
  viewportRef: React.RefObject<HTMLDivElement>;
  camera: Camera;
  setCamera: (next: Camera | ((prev: Camera) => Camera)) => void;
  /** Returns true if the wheel/pointer is on top of an interactive shape. */
  isOverShape?: (target: EventTarget | null) => boolean;
}

interface PanState {
  pointerId: number;
  startX: number;
  startY: number;
  startCameraX: number;
  startCameraY: number;
}

export function usePanZoom({ viewportRef, camera, setCamera }: Options) {
  const panRef = useRef<PanState | null>(null);
  const spaceHeldRef = useRef(false);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const factor = Math.exp(-e.deltaY * ZOOM_WHEEL_STEP * 4);
        setCamera((prev) =>
          zoomAtPoint(prev, prev.zoom * factor, anchor),
        );
      } else {
        e.preventDefault();
        setCamera((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [viewportRef, setCamera]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditableTarget(e.target)) {
        spaceHeldRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const isMiddle = e.button === 1;
      const isSpacePan = e.button === 0 && spaceHeldRef.current;
      if (!isMiddle && !isSpacePan) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startCameraX: cameraRef.current.x,
        startCameraY: cameraRef.current.y,
      };
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const pan = panRef.current;
      if (!pan || pan.pointerId !== e.pointerId) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      setCamera((prev) => ({
        ...prev,
        x: pan.startCameraX + dx,
        y: pan.startCameraY + dy,
      }));
    },
    [setCamera],
  );

  const endPan = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    panRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const anchor = { x: rect.width / 2, y: rect.height / 2 };
      setCamera((prev) =>
        zoomAtPoint(prev, clampZoom(prev.zoom * factor), anchor),
      );
    },
    [viewportRef, setCamera],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endPan,
    onPointerCancel: endPan,
    zoomBy,
    isSpaceHeld: () => spaceHeldRef.current,
    isPanning: () => panRef.current !== null,
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
