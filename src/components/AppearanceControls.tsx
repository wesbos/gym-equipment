import { useSyncExternalStore } from 'react';
import { DEFAULT_FRAME_COLOR, type Appearance, type HardwareFinish } from '../../rack-generator/appearance.ts';
import type { BuilderStore } from '../state/builder-store.ts';

export function AppearanceControls({ store }: { store: BuilderStore }) {
  const { doc, resolved, selected } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const physical = resolved.find(r => r.id === selected) ?? resolved.find(r => r.ownerId === selected);
  const appearance = doc.appearance ?? {};
  const update = (patch: Partial<Appearance>) => store.act(() => store.commit({ ...doc, appearance: { ...appearance, ...patch } }));
  const color = appearance.frameColor ?? DEFAULT_FRAME_COLOR;
  return <section aria-label="Rack appearance" className="appearance-controls">
    <h3>Appearance</h3>
    <label className="field"><span>Rack color</span><input aria-label="Rack color" type="color" value={color} onChange={e => update({ frameColor: e.target.value })} /></label>
    <label className="field"><span>Fastener finish</span><select aria-label="Fastener finish" value={appearance.hardwareFinish ?? 'chrome'} onChange={e => update({ hardwareFinish: e.target.value as HardwareFinish })}>
      <option value="chrome">Chrome</option><option value="gold">Gold</option><option value="oxide">Oxide (black)</option>
    </select></label>
    {physical && <>
      <label className="field"><span>This piece color</span><input aria-label="This piece color" type="color" value={appearance.overrides?.[physical.id] ?? color} onChange={e => update({ overrides: { ...appearance.overrides, [physical.id]: e.target.value } })} /></label>
      <p className="note">{physical.id.replaceAll('-', ' ')}</p>
      <button type="button" disabled={!appearance.overrides?.[physical.id]} onClick={() => {
        const overrides = { ...appearance.overrides }; delete overrides[physical.id]; update({ overrides });
      }}>Use rack color</button>
    </>}
  </section>;
}
