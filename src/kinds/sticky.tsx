import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ShapeKind, ShapeRenderProps, StickyShape } from '../types';
import { fitText, truncateToFit } from '../geometry/fitText';
import {
  DEFAULT_STICKY_SIZE,
  STICKY_FONT_MAX,
  STICKY_FONT_MIN,
  STICKY_Z_ROT_MAX_DEG,
} from '../constants';
import { createStickyShape } from '../state/reducer';

const BLOCK_TAGS = /^(DIV|P|H[1-6]|UL|OL|LI|BLOCKQUOTE|PRE|SECTION|ARTICLE)$/;

/**
 * Read the visible text of a contentEditable, preserving line breaks the
 * user inserted with Enter.
 *
 * `textContent` flattens `<div>` boundaries; `innerText` doubles them up
 * because an empty line in Chrome is `<div><br></div>` and innerText counts
 * BOTH the block boundary AND the inner `<br>`. We do our own walk: each
 * `<br>` is exactly one newline, each block adds at most one newline before
 * and one after, and consecutive newlines never collapse together unless the
 * user actually intended them.
 */
function readEditableText(el: HTMLElement): string {
  let out = '';
  // Treat the start of the buffer as "already past a newline" so a leading
  // block doesn't add a stray prefix newline.
  let lastWasNewline = true;

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text) {
        out += text;
        lastWasNewline = text.endsWith('\n');
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const e = node as HTMLElement;
    if (e.tagName === 'BR') {
      out += '\n';
      lastWasNewline = true;
      return;
    }
    if (BLOCK_TAGS.test(e.tagName)) {
      if (out && !lastWasNewline) {
        out += '\n';
        lastWasNewline = true;
      }
      e.childNodes.forEach(walk);
      if (!lastWasNewline) {
        out += '\n';
        lastWasNewline = true;
      }
      return;
    }
    e.childNodes.forEach(walk);
  };

  el.childNodes.forEach(walk);

  // Trailing newline is usually the filler <br> Chrome inserts; drop one.
  return out.endsWith('\n') ? out.slice(0, -1) : out;
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

/**
 * Default render component for sticky-note shapes. Exported so consumers can
 * compose it (e.g. as part of a custom kind that extends sticky behavior).
 * Usually you just register `stickyKind` instead of using this directly.
 */
export function StickyNote({
  shape,
  selected,
  editing,
  editVersion,
  textOverflow,
  depth3d,
  messages,
  pointerHandlers,
  className,
  onSelect,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  patch,
}: ShapeRenderProps<StickyShape>) {
  const textRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<string>(shape.text);
  const settledRef = useRef(false);
  const dirtyRef = useRef(false);

  // Custom scrollbar metrics. Native scrollbars are unreliable across OSes
  // (macOS hides overlay bars until interaction); rendering our own gives a
  // consistent always-on affordance while editing.
  const [scrollMetrics, setScrollMetrics] = useState({
    overflow: false,
    thumbPct: 1,
    posPct: 0,
  });
  const thumbDragRef = useRef<{
    startY: number;
    startScrollTop: number;
    ratio: number;
    maxScrollTop: number;
  } | null>(null);

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
      patch({ text: draftRef.current });
      onCommitEdit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Track scroll metrics while editing so the custom scrollbar can size
  // and position its thumb.
  useEffect(() => {
    if (!editing) {
      setScrollMetrics({ overflow: false, thumbPct: 1, posPct: 0 });
      return;
    }
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      const sh = el.scrollHeight;
      const ch = el.clientHeight;
      const overflow = sh > ch + 1;
      const thumbPct = overflow ? ch / sh : 1;
      const posPct = overflow ? el.scrollTop / (sh - ch) : 0;
      setScrollMetrics({ overflow, thumbPct, posPct });
    };
    measure();
    el.addEventListener('scroll', measure);
    el.addEventListener('input', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      el.removeEventListener('input', measure);
      ro.disconnect();
    };
  }, [editing, shape.id, shape.w, shape.h]);

  // Random Z rotation rolled deterministically from shape.id (+ editVersion
  // so it rerolls each time the user "puts the sticky back"). Surfaced as a
  // CSS variable; the actual transform lives in .cb-sticky in the stylesheet.
  const wobbleDeg = useMemo(() => {
    const h = hashId(shape.id, editVersion);
    const t = (h & 0xff) / 0xff;
    return (t * 2 - 1) * STICKY_Z_ROT_MAX_DEG;
  }, [shape.id, editVersion]);

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
      className={`${className} cb-sticky cb-sticky--${shape.color}${editing ? ' cb-sticky--editing' : ''}`}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.w,
        height: shape.h,
        // Wobble is the per-sticky random Z rotation; the transform lives
        // in .cb-sticky. Tilt's 3D-on default (5deg) is on .cb-root so
        // .cb-sticky--editing can cascade an override to 0deg. We only
        // touch the var inline when 3D is OFF — an inline value would
        // beat the editing-class override and leave the lifted shadow
        // counter-rotated against a parent that isn't tilted.
        ['--cb-sticky-wobble' as string]: `${wobbleDeg}deg`,
        ...(depth3d > 0
          ? null
          : { ['--cb-sticky-tilt-x' as string]: '0deg' }),
      } as React.CSSProperties}
      data-shape-id={shape.id}
      role="group"
      tabIndex={editing ? -1 : 0}
      aria-label={`${messages.aria.sticky}${shape.text ? `: ${shape.text}` : ''}`}
      onFocus={editing ? undefined : onSelect}
      onDoubleClick={editing ? undefined : onStartEdit}
      {...handlers}
    >
      {editing && scrollMetrics.overflow && (
        <div className="cb-sticky__scrollbar" aria-hidden>
          <div
            className="cb-sticky__scrollthumb"
            style={{
              height: `${scrollMetrics.thumbPct * 100}%`,
              top: `${scrollMetrics.posPct * (1 - scrollMetrics.thumbPct) * 100}%`,
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              const text = textRef.current;
              const thumb = e.currentTarget;
              const bar = thumb.parentElement;
              if (!text || !bar) return;
              const trackH = bar.getBoundingClientRect().height;
              const thumbH = thumb.getBoundingClientRect().height;
              const maxThumbOffset = Math.max(1, trackH - thumbH);
              const maxScrollTop = Math.max(1, text.scrollHeight - text.clientHeight);
              thumbDragRef.current = {
                startY: e.clientY,
                startScrollTop: text.scrollTop,
                ratio: maxScrollTop / maxThumbOffset,
                maxScrollTop,
              };
              thumb.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const drag = thumbDragRef.current;
              const text = textRef.current;
              if (!drag || !text) return;
              const dy = e.clientY - drag.startY;
              text.scrollTop = Math.max(
                0,
                Math.min(drag.maxScrollTop, drag.startScrollTop + dy * drag.ratio),
              );
            }}
            onPointerUp={(e) => {
              if (!thumbDragRef.current) return;
              thumbDragRef.current = null;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* noop */
              }
            }}
            onPointerCancel={() => {
              thumbDragRef.current = null;
            }}
          />
        </div>
      )}
      <div
        ref={textRef}
        className={`cb-sticky__text${editing && scrollMetrics.overflow ? ' cb-sticky__text--overflowing' : ''}`}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={editing ? false : undefined}
        role={editing ? 'textbox' : undefined}
        aria-multiline={editing ? 'true' : undefined}
        onInput={
          editing
            ? (e) => {
                draftRef.current = readEditableText(e.currentTarget);
                dirtyRef.current = true;
                // Stay at full font size while typing in either mode — the
                // custom scrollbar handles overflow. Auto-shrink runs again
                // on commit (display useLayoutEffect).
              }
            : undefined
        }
        onBlur={
          editing
            ? () => {
                if (settledRef.current) return;
                settledRef.current = true;
                patch({ text: draftRef.current });
                onCommitEdit();
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
                  patch({ text: draftRef.current });
                  onCommitEdit();
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

/** Icon rendered in the default toolbar's sticky-note button. Exported so
 *  consumers building their own toolbar can reuse it. */
export function StickyIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden focusable={false}>
      <path d="M3 3h11l3 3v11H3V3z" fill="currentColor" opacity="0.9" />
      <path d="M14 3v3h3" stroke="rgba(0,0,0,0.25)" fill="none" strokeWidth="1" />
    </svg>
  );
}

/**
 * The default sticky-note shape kind. Includes the renderer, a factory
 * (delegates to `createStickyShape`), and a toolbar button that activates a
 * `'sticky'` tool. Exported individually and re-exported in `defaultShapeKinds`.
 */
export const stickyKind: ShapeKind<StickyShape> = {
  type: 'sticky',
  defaultSize: DEFAULT_STICKY_SIZE,
  create: (id, x, y) => createStickyShape(id, x, y),
  Component: StickyNote,
  toolButton: {
    toolId: 'sticky',
    icon: <StickyIcon />,
    label: (m) => m.toolbar.stickyNote,
  },
};
