import { useMemo, useState } from 'react';
import { CasmaBoard } from '@casmadev/board';
import type { Direction, Messages, TextOverflow } from '@casmadev/board';
import {
  en,
  es,
  fr,
  ptBR,
  de,
  ja,
  ar,
  he,
} from '@casmadev/board/locales';
import '@casmadev/board/styles.css';

const LOCALES: Record<string, Messages> = { en, es, fr, 'pt-BR': ptBR, de, ja, ar, he };
const RTL_LOCALES = new Set(['ar', 'he']);

export default function App() {
  const [locale, setLocale] = useState<keyof typeof LOCALES>('en');
  const [direction, setDirection] = useState<Direction>('ltr');
  const [textOverflow, setTextOverflow] = useState<TextOverflow>('shrink-to-fit');
  const [depth3d, setDepth3d] = useState(800);

  const messages = useMemo(() => LOCALES[locale], [locale]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          flexWrap: 'wrap',
        }}
      >
        <strong>CasmaBoard playground</strong>
        <label>
          Locale:&nbsp;
          <select
            value={locale}
            onChange={(e) => {
              const next = e.target.value as keyof typeof LOCALES;
              setLocale(next);
              setDirection(RTL_LOCALES.has(next) ? 'rtl' : 'ltr');
            }}
          >
            {Object.keys(LOCALES).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label>
          Direction:&nbsp;
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
          >
            <option value="ltr">ltr</option>
            <option value="rtl">rtl</option>
          </select>
        </label>
        <label>
          Text overflow:&nbsp;
          <select
            value={textOverflow}
            onChange={(e) => setTextOverflow(e.target.value as TextOverflow)}
          >
            <option value="shrink-to-fit">shrink-to-fit</option>
            <option value="truncate">truncate</option>
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          3D depth:&nbsp;
          <input
            type="range"
            min={0}
            max={2400}
            step={50}
            value={depth3d}
            onChange={(e) => setDepth3d(Number(e.target.value))}
            style={{ width: 140 }}
          />
          <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 48 }}>
            {depth3d === 0 ? 'off' : `${depth3d}px`}
          </span>
        </label>
        <span style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
          Pick sticky → click canvas. Double-click to edit. Space+drag or middle-mouse to pan. Cmd/Ctrl+wheel to zoom.
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CasmaBoard
          messages={messages}
          direction={direction}
          textOverflow={textOverflow}
          depth3d={depth3d}
        />
      </div>
    </div>
  );
}
