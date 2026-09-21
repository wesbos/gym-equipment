import type { ReactNode } from 'react';
import type { BuilderSnapshot, BuilderStore } from '../../state/builder-store.ts';
import { shallowEqual, useStoreSelector } from '../../state/use-store.ts';
import { selectionKind } from '../../state/selection-actions.ts';
import { swapCandidate } from '../../../rack-generator/swap.ts';
import { FloorInspector } from '../FloorInspector.tsx';
import { WallInspector } from '../WallInspector.tsx';
import { HangInspector } from '../HangInspector.tsx';
import { RoomInspector } from '../RoomInspector.tsx';
import { RackInspector } from './RackInspector.tsx';
import './inspector.css';

type InspectorRoute = { kind: 'floor' | 'wall' | 'hang'; id: string } | { kind: 'full' | 'room' };
/** Which inspector the selection needs. Floor, wall and hang items get their own inspectors, which subscribe to their
 * item only, so dragging one does not re-render the generic inspector. */
export function inspectorRoute(s: BuilderSnapshot): InspectorRoute {
  if (s.structureChoice) return { kind: 'full' };
  const kind = selectionKind(s);
  if (kind === 'room') return { kind: 'room' };
  if (kind === 'floor' || kind === 'wall' || kind === 'hang') return { kind, id: s.resolved.find(r => r.id === s.selected)?.id ?? s.resolved.find(r => r.ownerId === s.selected)!.id };
  return { kind: 'full' };
}
function Inspector({ store, onResetRack }: { store: BuilderStore; onResetRack?: () => void }) {
  const route = useStoreSelector(store, inspectorRoute, shallowEqual);
  if (route.kind === 'room') return <RoomInspector store={store} />;
  if (route.kind === 'floor') return <FloorInspector store={store} id={route.id} />;
  if (route.kind === 'hang') return <HangInspector store={store} id={route.id} />;
  if (route.kind === 'wall') return <WallInspector store={store} id={route.id} />;
  return <RackInspector store={store} onResetRack={onResetRack} />;
}
/** While placing a new accessory: swap it in for an existing one instead. */
function SwapAccessory({ store }: { store: BuilderStore }) {
  const swap = useStoreSelector(store, s => s.placing && !s.placing.movingId ? { part: s.placing.part, doc: s.doc } : null, shallowEqual);
  if (!swap) return null;
  const buttons = swap.doc.accessories.map(a => {
    const candidate = swapCandidate(swap.doc, a.id, swap.part);
    return candidate.valid ? <button type="button" key={a.id} onClick={() => store.act(() => { store.commit(candidate.doc); store.select(candidate.ownerId); })}>Swap {a.id}</button> : null;
  }).filter(Boolean);
  if (!buttons.length) return null;
  return <details className="insp-section insp-swap-existing"><summary><span className="insp-section-title">Swap an existing accessory</span></summary><div className="insp-section-body insp-stack">{buttons}</div></details>;
}
/** The inspector column (desktop right panel, or the mobile inspector sheet): header, grouped sections and a sticky
 * action footer for whatever is selected; rack settings when nothing is. `children` (warnings) render above the
 * footer. Re-keyed on history navigation so uncontrolled inputs pick up the restored document. */
export function InspectorPanel({ store, onResetRack, children }: { store: BuilderStore; onResetRack?: () => void; children?: ReactNode }) {
  const revision = useStoreSelector(store, s => s.inputRevision);
  return <div className="insp">
    <SwapAccessory store={store} />
    <Inspector key={revision} store={store} onResetRack={onResetRack} />
    {children && <div className="insp-extra">{children}</div>}
  </div>;
}
