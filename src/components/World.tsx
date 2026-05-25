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
        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {children}
    </div>
  );
}
