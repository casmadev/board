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
    <nav className="cb-panel cb-panel--inline cb-panel--tabs">
      {DEMO_ROUTES.map((r) => {
        const isActive = r.hash === active.hash;
        return (
          <a
            key={r.hash}
            href={r.hash}
            className={isActive ? 'cb-tab cb-tab--active' : 'cb-tab'}
            aria-current={isActive ? 'page' : undefined}
          >
            {r.label}
          </a>
        );
      })}
    </nav>
  );
}
