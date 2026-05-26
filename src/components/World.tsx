import type { ReactNode } from 'react';
import type { Camera } from '../types';

interface Props {
  camera: Camera;
  children?: ReactNode;
}

export function World({ camera, children }: Props) {
  return (
    <div
      className="cb-world"
      style={{
        // scale3d (not the 2D scale) so the Z axis scales with zoom.
        // Stickies tilt via rotateX, which produces a Z displacement
        // proportional to their height; without scaling Z the
        // viewport's perspective foreshortens the same absolute pixels
        // at every zoom, so a zoomed-out (smaller) sticky reads as
        // disproportionately MORE tilted. Scaling Z keeps the apparent
        // 3D tilt constant across zoom.
        transform: `translate(${camera.x}px, ${camera.y}px) scale3d(${camera.zoom}, ${camera.zoom}, ${camera.zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {children}
    </div>
  );
}
