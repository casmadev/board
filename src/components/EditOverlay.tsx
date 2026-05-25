import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Camera, StickyShape } from '../types';
import { worldToScreen } from '../geometry/camera';

interface Props {
  shape: StickyShape;
  camera: Camera;
  baseFontSize: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export function EditOverlay({
  shape,
  camera,
  baseFontSize,
  onCommit,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState(shape.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, []);

  useEffect(() => {
    setDraft(shape.text);
  }, [shape.id]);

  const screen = worldToScreen(camera, { x: shape.x, y: shape.y });

  return (
    <textarea
      ref={textareaRef}
      className="cb-edit-overlay"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit(draft);
        }
        e.stopPropagation();
      }}
      style={{
        left: screen.x,
        top: screen.y,
        width: shape.w * camera.zoom,
        height: shape.h * camera.zoom,
        fontSize: baseFontSize * camera.zoom,
        padding: 12 * camera.zoom,
      }}
    />
  );
}
