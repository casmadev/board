import { useEffect, useRef, useState } from 'react';
import { CasmaBoard } from '@casmadev/board';
import type { Shape } from '@casmadev/board';
import { DemoNav } from './DemoNav';

/* ------------------------------------------------------------------ */
/* Event log model                                                    */
/* ------------------------------------------------------------------ */

type EventKind =
  | 'add'
  | 'remove'
  | 'patch'
  | 'select'
  | 'deselect'
  | 'editStart'
  | 'editCommit'
  | 'editCancel'
  | 'dragStart'
  | 'dragMove'
  | 'dragEnd';

interface LogEntry {
  /** Monotonic id so React can key without dedup issues — events fire fast. */
  id: number;
  /** Wall-clock time the entry was appended; used only for the relative
   *  display, not as a key (close-together events would collide). */
  at: number;
  kind: EventKind;
  shapeId: string;
  shapeType: string;
  detail?: string;
}

const KIND_META: Record<
  EventKind,
  { label: string; color: string; bg: string }
> = {
  add:        { label: 'Add',         color: '#065f46', bg: '#d1fae5' },
  remove:     { label: 'Remove',      color: '#7f1d1d', bg: '#fee2e2' },
  patch:      { label: 'Patch',       color: '#1e3a8a', bg: '#dbeafe' },
  select:     { label: 'Select',      color: '#5b21b6', bg: '#ede9fe' },
  deselect:   { label: 'Deselect',    color: '#5b21b6', bg: '#f5f3ff' },
  editStart:  { label: 'Edit start',  color: '#92400e', bg: '#fef3c7' },
  editCommit: { label: 'Edit commit', color: '#92400e', bg: '#fde68a' },
  editCancel: { label: 'Edit cancel', color: '#92400e', bg: '#fef3c7' },
  dragStart:  { label: 'Drag start',  color: '#374151', bg: '#e5e7eb' },
  dragMove:   { label: 'Drag move',   color: '#374151', bg: '#f3f4f6' },
  dragEnd:    { label: 'Drag end',    color: '#374151', bg: '#e5e7eb' },
};

const MAX_LOG = 200; // cap so high-frequency events (drag-move) don't blow up

/* ------------------------------------------------------------------ */
/* Log panel — auto-scrolls and shows a per-kind toggle row so high-  */
/* frequency events like `patch` and `dragMove` can be muted.         */
/* ------------------------------------------------------------------ */

function EventLogPanel({
  log,
  visibleKinds,
  setKindVisible,
  onClear,
}: {
  log: LogEntry[];
  visibleKinds: Set<EventKind>;
  setKindVisible: (kind: EventKind, visible: boolean) => void;
  onClear: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  // Auto-scroll to the bottom when new entries arrive. We track the previous
  // length to detect whether the user has scrolled up to read history — if
  // they have, we leave the scroll alone instead of yanking them back down.
  const prevLenRef = useRef(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const grew = log.length > prevLenRef.current;
    prevLenRef.current = log.length;
    if (!grew) return;
    const atBottom =
      el.scrollHeight - el.clientHeight - el.scrollTop < 40;
    if (atBottom) el.scrollTop = el.scrollHeight;
  }, [log]);

  const visible = log.filter((e) => visibleKinds.has(e.kind));

  return (
    <div
      className="cb-panel cb-panel--flush"
      style={{ width: 360, maxHeight: 'calc(100vh - 80px)' }}
    >
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 className="cb-panel__title">Event log</h2>
        <button
          type="button"
          className="cb-button cb-button--sm"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
      <hr className="cb-separator" />
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        {(Object.keys(KIND_META) as EventKind[]).map((k) => {
          const meta = KIND_META[k];
          const on = visibleKinds.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKindVisible(k, !on)}
              style={{
                appearance: 'none',
                border: 'none',
                background: on ? meta.bg : '#f3f4f6',
                color: on ? meta.color : 'rgba(0,0,0,0.4)',
                borderRadius: 4,
                padding: '3px 7px',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                textDecoration: on ? 'none' : 'line-through',
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
      <hr className="cb-separator" />
      <div
        ref={listRef}
        style={{
          overflowY: 'auto',
          flex: 1,
          padding: '6px 0',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        }}
      >
        {visible.length === 0 && (
          <div
            style={{
              padding: '12px',
              color: 'rgba(0,0,0,0.4)',
              textAlign: 'center',
            }}
          >
            No events yet — click, drag, or edit a shape.
          </div>
        )}
        {visible.map((e) => {
          const meta = KIND_META[e.kind];
          return (
            <div
              key={e.id}
              style={{
                padding: '4px 12px',
                display: 'flex',
                gap: 8,
                alignItems: 'baseline',
                borderBottom: '1px dotted rgba(0,0,0,0.04)',
              }}
            >
              <span
                style={{
                  background: meta.bg,
                  color: meta.color,
                  borderRadius: 3,
                  padding: '1px 6px',
                  fontWeight: 600,
                  fontSize: 10.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {meta.label}
              </span>
              <span style={{ color: 'rgba(0,0,0,0.55)', fontSize: 11 }}>
                {e.shapeType}#{e.shapeId.slice(0, 6)}
              </span>
              {e.detail && (
                <span
                  style={{
                    color: 'rgba(0,0,0,0.45)',
                    fontSize: 11,
                    marginLeft: 'auto',
                  }}
                >
                  {e.detail}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CallbacksDemo                                                      */
/* ------------------------------------------------------------------ */

export default function CallbacksDemo() {
  const [log, setLog] = useState<LogEntry[]>([]);
  // `dragMove` and `patch` fire on every pixel — start them off so the
  // initial impression isn't a wall of move entries.
  const [visibleKinds, setVisibleKinds] = useState<Set<EventKind>>(
    () =>
      new Set<EventKind>([
        'add',
        'remove',
        'select',
        'deselect',
        'editStart',
        'editCommit',
        'editCancel',
        'dragStart',
        'dragEnd',
      ]),
  );
  const nextIdRef = useRef(0);

  const append = (
    kind: EventKind,
    shape: Shape,
    detail?: string,
  ) => {
    setLog((prev) => {
      const next = prev.concat({
        id: nextIdRef.current++,
        at: Date.now(),
        kind,
        shapeId: shape.id,
        shapeType: shape.type,
        detail,
      });
      // Trim from the front when over cap — keeps the most recent activity.
      if (next.length > MAX_LOG) next.splice(0, next.length - MAX_LOG);
      return next;
    });
  };

  const setKindVisible = (kind: EventKind, visible: boolean) => {
    setVisibleKinds((prev) => {
      const next = new Set(prev);
      if (visible) next.add(kind);
      else next.delete(kind);
      return next;
    });
  };

  return (
    <CasmaBoard
      background="dots"
      onShapeAdd={(s) => append('add', s, `at (${Math.round(s.x)}, ${Math.round(s.y)})`)}
      onShapeRemove={(s) => append('remove', s)}
      onShapePatch={(s, patch) =>
        append('patch', s, Object.keys(patch).join(', '))
      }
      onShapeSelect={(s) => append('select', s)}
      onShapeDeselect={(s) => append('deselect', s)}
      onShapeEditStart={(s) => append('editStart', s)}
      onShapeEditCommit={(s) =>
        append(
          'editCommit',
          s,
          'text' in s && typeof (s as { text?: unknown }).text === 'string'
            ? `"${((s as { text: string }).text || '').slice(0, 20)}"`
            : undefined,
        )
      }
      onShapeEditCancel={(s) => append('editCancel', s)}
      onShapeDragStart={(s) => append('dragStart', s)}
      onShapeDragMove={(s) =>
        append('dragMove', s, `(${Math.round(s.x)}, ${Math.round(s.y)})`)
      }
      onShapeDragEnd={(s) =>
        append('dragEnd', s, `→ (${Math.round(s.x)}, ${Math.round(s.y)})`)
      }
      slots={{
        topLeft: <DemoNav />,
        topRight: (
          <EventLogPanel
            log={log}
            visibleKinds={visibleKinds}
            setKindVisible={setKindVisible}
            onClear={() => setLog([])}
          />
        ),
      }}
    />
  );
}
