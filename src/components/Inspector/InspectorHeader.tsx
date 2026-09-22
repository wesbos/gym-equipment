import type { ReactNode } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import { useStoreSelector } from '../../state/use-store.ts';
import { isLockedIn } from '../../state/selection-actions.ts';
import { shortcutLabel } from '../../state/shortcuts.ts';
import { Icon } from '../SelectionBar/icons.tsx';
import { PartThumbnail } from '../PartThumbnail.tsx';
import { partMeta } from './part-meta.ts';

/** Inspector title block: thumbnail, name, maker credit and catalog section, with the way back to rack settings.
 * `part` fills everything from the catalog; `title`/`chip`/`art` cover rack settings, the room and multi-select. */
export function InspectorHeader({ store, part, title, chip, subtitle, art, back = true }: {
  store: BuilderStore; part?: string | null; title?: string; chip?: string | null; subtitle?: ReactNode; art?: ReactNode; back?: boolean;
}) {
  const definitions = useStoreSelector(store, s => s.definitions);
  const meta = part ? partMeta(part, definitions) : null;
  const name = title ?? meta?.name ?? '';
  const section = chip === undefined ? meta?.section : chip;
  return <header className="insp-header">
    {back && <div className="insp-header-bar">
      <button id="deselect" type="button" className="insp-back" onClick={() => store.select(null)}>← Rack settings</button>
      <LockToggle store={store} />
    </div>}
    <div className="insp-hero">
      <span className="insp-art">{art ?? (part ? <PartThumbnail part={part} className="insp-thumb" /> : null)}</span>
      <div className="insp-titles">
        {section && <span className="insp-chip">{section}</span>}
        <h2 id="selection-title">{name}</h2>
        {subtitle ?? (meta && (meta.url
          ? <a className="insp-brand" href={meta.url} target="_blank" rel="noreferrer" title={meta.trademark ?? undefined}>{meta.brand} ↗</a>
          : <span className="insp-brand">{meta.brand}</span>))}
      </div>
    </div>
  </header>;
}

/** Lock or unlock the selection (#219): a locked part stays put while you orbit and click around a busy gym. */
function LockToggle({ store }: { store: BuilderStore }) {
  const state = useStoreSelector(store, s => !s.selection.length || s.roomInspector ? null : s.selection.every(id => isLockedIn(s, id)) ? 'locked' : 'unlocked');
  if (!state) return null;
  const locked = state === 'locked';
  return <button type="button" className="insp-lock" aria-pressed={locked} title={`${locked ? 'Unlock' : 'Lock'} (${shortcutLabel('lock')}): a locked part can't be dragged, moved or rotated`}
    onClick={() => store.setLocked(store.getSnapshot().selection, !locked)}>
    <Icon name={locked ? 'lock' : 'unlock'} size={14} />{locked ? 'Locked' : 'Lock'}
  </button>;
}
