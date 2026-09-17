import { useSyncExternalStore } from 'react';
import { DEFAULT_FRAME_COLOR, type Appearance, type HardwareFinish } from '../../rack-generator/appearance.ts';
import type { BuilderStore } from '../state/builder-store.ts';

export function AppearanceControls({ store }: { store: BuilderStore }) {
  const { doc, resolved, selected, selection } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const physical = resolved.find(r => r.id === selected) ?? resolved.find(r => r.ownerId === selected);
  const appearance = doc.appearance ?? {};
  const update = (patch: Partial<Appearance>) => store.act(() => store.commit({ ...doc, appearance: { ...appearance, ...patch } }));
  const colors = selection.map(id => appearance.overrides?.[id] ?? appearance.frameColor ?? DEFAULT_FRAME_COLOR);
  const mixed = colors.some(value => value !== colors[0]);
  const color = appearance.frameColor ?? DEFAULT_FRAME_COLOR;
  return <section aria-label="Rack appearance" className="appearance-controls">
    <h3>Appearance</h3>
    <label className="field"><span>Rack color</span><input aria-label="Rack color" type="color" value={color} onChange={e => update({ frameColor: e.target.value })} /></label>
    <label className="field"><span>Hardware finish</span><select aria-label="Hardware finish" value={appearance.hardwareFinish ?? 'chrome'} onChange={e => update({ hardwareFinish: e.target.value as HardwareFinish })}>
      <option value="chrome">Chrome</option><option value="gold">Gold</option><option value="oxide">Oxide (black)</option>
    </select></label>
    {physical && <>
      <label className="field"><span>{selection.length > 1 ? 'Selected pieces color' : 'This piece color'}{mixed ? ' · Mixed' : ''}</span><input aria-label={selection.length > 1 ? "Selected pieces color" : "This piece color"} type="color" value={mixed ? "#808080" : colors[0] ?? color} onChange={e => store.act(() => store.paintSelection(e.target.value))} /></label>
      <p className="note">{selection.length > 1 ? `${selection.length} pieces` : physical.id.replaceAll('-', ' ')} · painted surfaces only. Handles, liners and rods keep their original finish.</p>
      <button type="button" disabled={!selection.some(id => appearance.overrides?.[id])} onClick={() => {
        store.act(() => store.paintSelection());
      }}>Use rack color</button>
    </>}
    <p className="note">Hardware finish applies to bolts and fasteners only.</p>
  </section>;
}
