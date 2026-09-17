import { ResetButton } from './ResetButton.tsx';
import { useSyncExternalStore } from 'react';
import { DEFAULT_FRAME_COLOR, type Appearance, type HardwareFinish } from '../../rack-generator/appearance.ts';
import type { BuilderStore } from '../state/builder-store.ts';

export function AppearanceControls({ store }: { store: BuilderStore }) {
  const { doc, resolved, selected, selection } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const physical = resolved.find(r => r.id === selected) ?? resolved.find(r => r.ownerId === selected);
  const appearance = doc.appearance ?? {};
  const update = (patch: Partial<Appearance>) => store.act(() => store.commit({ ...doc, appearance: { ...appearance, ...patch } }));
  const colors = selection.map(id => appearance.overrides?.[id] ?? appearance.frameColor ?? (id.startsWith('floor-') ? '#353739' : DEFAULT_FRAME_COLOR));
  const mixed = colors.some(value => value !== colors[0]);
  const color = appearance.frameColor ?? DEFAULT_FRAME_COLOR;
  return <section aria-label="Rack appearance" className="appearance-controls">
    <h3>Appearance</h3>
    {selection.length < 2 && <>
    <label className="field"><span>Rack color</span><input aria-label="Rack color" type="color" value={color} onChange={e => update({ frameColor: e.target.value })} /><ResetButton label="rack color" changed={color !== DEFAULT_FRAME_COLOR} onReset={() => update({ frameColor: DEFAULT_FRAME_COLOR })} /></label>
    <label className="field"><span>Fastener finish</span><select aria-label="Fastener finish" value={appearance.hardwareFinish ?? ''} onChange={e => update({ hardwareFinish: e.target.value ? e.target.value as HardwareFinish : undefined })}>
      <option value="">Original finishes</option><option value="chrome">Chrome</option><option value="gold">Gold</option><option value="oxide">Oxide (black)</option>
    </select><ResetButton label="hardware finish" changed={!!appearance.hardwareFinish} onReset={() => update({ hardwareFinish: undefined })} /></label>
    </>}
    {physical && <>
      <label className="field"><span>{selection.length > 1 ? 'Selected pieces color' : 'This piece color'}{mixed ? ' · Mixed' : ''}</span><input aria-label={selection.length > 1 ? "Selected pieces color" : "This piece color"} type="color" value={mixed ? "#808080" : colors[0] ?? color} onChange={e => store.act(() => store.paintSelection(e.target.value))} /></label>
      <p className="note">{selection.length > 1 ? `${selection.length} pieces` : physical.id.replaceAll('-', ' ')}</p>
      <button type="button" disabled={!selection.some(id => appearance.overrides?.[id])} onClick={() => {
        store.act(() => store.paintSelection());
      }}>Use rack color</button>
    </>}
  </section>;
}
