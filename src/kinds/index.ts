import type { ShapeKind } from '../types';
import { stickyKind } from './sticky';

export { stickyKind, StickyNote, StickyIcon } from './sticky';

/**
 * Out-of-the-box set of shape kinds the board ships with. v0 contains only
 * the sticky note. Spread to extend:
 *
 * ```ts
 * <CasmaBoard shapeKinds={[...defaultShapeKinds, myCustomKind]} />
 * ```
 *
 * Typed as `ShapeKind<any>[]` to permit a heterogeneous mix — kinds with
 * different shape generics don't unify under a single `ShapeKind<Shape>`
 * because Component is contravariant in its shape param.
 */
export const defaultShapeKinds: ShapeKind<any>[] = [stickyKind];
