import type { ReactNode } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import { useStoreSelector } from '../../state/use-store.ts';
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
    {back && <button id="deselect" type="button" className="insp-back" onClick={() => store.select(null)}>← Rack settings</button>}
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
