import { useMemo, useState } from 'react';
import { CasmaBoard } from '@casmadev/board';
import type { Direction, Messages } from '@casmadev/board';
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
        <span style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
          Pick sticky → click canvas. Double-click to edit. Space+drag or middle-mouse to pan. Cmd/Ctrl+wheel to zoom.
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CasmaBoard messages={messages} direction={direction} />
      </div>
    </div>
  );
}
