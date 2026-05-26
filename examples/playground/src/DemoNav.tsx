/* Tiny hash-route navigation chip used in the topLeft slot of every demo.
   Reading window.location.hash directly (with a hashchange listener) keeps
   the playground dependency-free — no router library needed. */

import { useEffect, useState } from 'react';

export interface DemoRoute {
  hash: string;
  label: string;
}

export const DEMO_ROUTES: DemoRoute[] = [
  { hash: '#/', label: 'Playground' },
  { hash: '#/disabled', label: 'Disabled shapes' },
  { hash: '#/bmc', label: 'BMC' },
  { hash: '#/callbacks', label: 'Callbacks' },
];

/** Normalize whatever's currently in the URL to one of the known routes. */
export function currentRoute(): DemoRoute {
  const h = window.location.hash || '#/';
  return DEMO_ROUTES.find((r) => r.hash === h) ?? DEMO_ROUTES[0]!;
}

/** Subscribes to hashchange and returns the active route. */
export function useDemoRoute(): DemoRoute {
  const [route, setRoute] = useState<DemoRoute>(() => currentRoute());
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Pill-style demo switcher. Drop into slots.topLeft of any demo. */
export function DemoNav() {
  const active = useDemoRoute();
  return (
    <nav
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 8,
        padding: 4,
        display: 'inline-flex',
        gap: 4,
        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
        fontSize: 12,
      }}
    >
      {DEMO_ROUTES.map((r) => {
        const isActive = r.hash === active.hash;
        return (
          <a
            key={r.hash}
            href={r.hash}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              textDecoration: 'none',
              color: isActive ? '#1a1a1a' : 'rgba(0,0,0,0.55)',
              fontWeight: isActive ? 600 : 500,
              background: isActive ? '#f3f4f6' : 'transparent',
            }}
          >
            {r.label}
          </a>
        );
      })}
    </nav>
  );
}
