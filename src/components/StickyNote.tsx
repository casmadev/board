import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { StickyShape, TextOverflow } from '../types';
import type { Messages } from '../i18n';
import { fitText, truncateToFit } from '../geometry/fitText';
import {
  STICKY_EDIT_LIFT_PX,
  STICKY_FONT_MAX,
  STICKY_FONT_MIN,
  STICKY_TILT_X_DEG,
  STICKY_Z_ROT_MAX_DEG,
} from '../constants';

interface Props {
  shape: StickyShape;
  selected: boolean;
  editing: boolean;
  editVersion: number;
  textOverflow: TextOverflow;
  depth3d: number;
  messages: Messages;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  };
  onDoubleClick: () => void;
  onFocus: () => void;
  onCommitEdit: (text: string) => void;
  onCancelEdit: () => void;
}

// Deterministic 32-bit FNV-1a hash for stable per-sticky randomization.
function hashId(id: string, salt: number): number {
  let h = 2166136261;
  const s = `${id}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function StickyNote({
  shape,
  selected,
  editing,
  editVersion,
  textOverflow,
  depth3d,
  messages,
  pointerHandlers,
  onDoubleClick,
  onFocus,
  onCommitEdit,
  onCancelEdit,
}: Props) {
  const textRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<string>(shape.text);
  const settledRef = useRef(false);
  const dirtyRef = useRef(false);

  // Render text (display mode) and run shrink/truncate fit.
  useLayoutEffect(() => {
    if (editing) return; // edit mode owns the DOM content
    const el = textRef.current;
    if (!el) return;
    if (textOverflow === 'truncate') {
      el.style.fontSize = `${STICKY_FONT_MAX}px`;
      truncateToFit(el, shape.text);
    } else {
      el.style.fontSize = '';
      el.textContent = shape.text;
      fitText(el, STICKY_FONT_MAX, STICKY_FONT_MIN);
    }
  }, [editing, shape.text, shape.w, shape.h, textOverflow]);

  // Enter edit: seed text, ensure caret has a line-box even when empty,
  // focus, and place caret at end.
  useLayoutEffect(() => {
    if (!editing) return;
    const el = textRef.current;
    if (!el) return;
    settledRef.current = false;
    dirtyRef.current = false;
    draftRef.current = shape.text;
    // Always render at the full editing font; auto-shrink resumes after commit.
    el.style.fontSize = `${STICKY_FONT_MAX}px`;
    if (shape.text) {
      el.textContent = shape.text;
    } else {
      // <br> gives the empty contentEditable a line-box so the flex centering
      // applies to the caret. Without it the caret sticks to the top-left.
      el.innerHTML = '<br>';
    }
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing, shape.id]);

  // Commit on edit-end (covers the click-outside path where blur may race
  // unmount). Skipped when nothing was typed or already settled.
  useEffect(() => {
    if (!editing) return;
    return () => {
      if (settledRef.current) return;
      if (!dirtyRef.current) return;
      onCommitEdit(draftRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const zRotDeg = useMemo(() => {
    const h = hashId(shape.id, editVersion);
    const t = (h & 0xff) / 0xff;
    return (t * 2 - 1) * STICKY_Z_ROT_MAX_DEG;
  }, [shape.id, editVersion]);

  // While editing, the sticky is held flat off the page — no tilt, no wobble,
  // just the translateZ lift. On exit, both rotations re-engage (with a new
  // wobble rolled from editVersion) and CSS interpolates each operation, so
  // the put-back motion combines a descent + slight re-rotation.
  const lift = editing ? STICKY_EDIT_LIFT_PX : 0;
  const tiltX = editing ? 0 : STICKY_TILT_X_DEG;
  const wobble = editing ? 0 : zRotDeg;
  const transform =
    depth3d > 0
      ? `translateZ(${lift}px) rotateX(${tiltX}deg) rotate(${wobble}deg)`
      : `rotate(${wobble}deg)`;

  // Drag handlers are inert during edit so clicks position the caret instead.
  const handlers = editing
    ? {
        // Keep pointerdown from bubbling to viewport (which would deselect /
        // cancel edit). Only when editing.
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          e.stopPropagation();
        },
      }
    : pointerHandlers;

  return (
    <div
      className={`cb-sticky cb-sticky--${shape.color}${selected ? ' cb-sticky--selected' : ''}${editing ? ' cb-sticky--editing' : ''}`}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: shape.h,
        transform,
      }}
      data-shape-id={shape.id}
      role="group"
      tabIndex={editing ? -1 : 0}
      aria-label={`${messages.aria.sticky}${shape.text ? `: ${shape.text}` : ''}`}
      onFocus={editing ? undefined : onFocus}
      onDoubleClick={editing ? undefined : onDoubleClick}
      {...handlers}
    >
      <div
        ref={textRef}
        className="cb-sticky__text"
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={editing ? false : undefined}
        role={editing ? 'textbox' : undefined}
        aria-multiline={editing ? 'true' : undefined}
        onInput={
          editing
            ? (e) => {
                const el = e.currentTarget;
                draftRef.current = el.textContent ?? '';
                dirtyRef.current = true;
                if (textOverflow === 'shrink-to-fit') {
                  fitText(el, STICKY_FONT_MAX, STICKY_FONT_MIN);
                }
              }
            : undefined
        }
        onBlur={
          editing
            ? () => {
                if (settledRef.current) return;
                settledRef.current = true;
                onCommitEdit(draftRef.current);
              }
            : undefined
        }
        onKeyDown={
          editing
            ? (e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  settledRef.current = true;
                  onCancelEdit();
                  return;
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  settledRef.current = true;
                  onCommitEdit(draftRef.current);
                  return;
                }
                e.stopPropagation();
              }
            : undefined
        }
      />
    </div>
  );
}
