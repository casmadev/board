import '@casmadev/board/styles.css';
import './fan-toolbar.css';
import MainDemo from './MainDemo';
import DisabledShapesDemo from './DisabledShapesDemo';
import BmcDemo from './BmcDemo';
import CallbacksDemo from './CallbacksDemo';
import { useDemoRoute } from './DemoNav';

/**
 * Tiny hash-based router. Each demo renders its own `<CasmaBoard>` with
 * its own slots — including a `<DemoNav />` in the topLeft that swaps
 * between them. No router library needed; the playground stays
 * dependency-free.
 */
export default function App() {
  const route = useDemoRoute();
  return (
    <div style={{ height: '100%' }}>
      {route.hash === '#/disabled' ? (
        <DisabledShapesDemo />
      ) : route.hash === '#/bmc' ? (
        <BmcDemo />
      ) : route.hash === '#/callbacks' ? (
        <CallbacksDemo />
      ) : (
        <MainDemo />
      )}
    </div>
  );
}
