import type { Target } from './types.ts';

/** Preserve legacy side IDs when distinct, and use pair order when endpoint
 * names collide. All resolvers and unpair paint transfer share this convention.
 */
export function pairSuffix(targets: readonly Target[], index: number): 'left' | 'right' {
  const legacy = ['front-left', 'front-right', 'rear-left', 'rear-right'];
  const preferred = targets.map((target, i) => legacy.includes(target.uprightId)
    ? target.uprightId.endsWith('-right') ? 'right' : 'left'
    : i ? 'right' : 'left');
  return new Set(preferred).size === preferred.length ? preferred[index] : index ? 'right' : 'left';
}
