import { useSyncExternalStore } from 'react';
import { DEFAULT_FRAME_COLOR, PAINT_SWATCHES, type Appearance, type FrameFinish, type HardwareFinish } from '../../rack-generator/appearance.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import './appearance-controls.css';

function PaintPicker({ label, color, finish, onColor, onFinish }: {
  label: string; color: string; finish: FrameFinish;
  onColor(color: string): void; onFinish(finish: FrameFinish): void;
}) {
  return <fieldset className="paint-picker"><legend>{label}</legend>
    <div className="paint-swatches">{PAINT_SWATCHES.map(([name, hex]) =>
      <button key={name} type="button" title={name} aria-label={`${label}: ${name}`} aria-pressed={finish === 'paint' && color === hex} onClick={() => onColor(hex)}>
        <span style={{ background: hex }} />{name}
      </button>)}</div>
    <label className="field"><span>Custom color</span><input aria-label={`${label} color`} type="color" value={color} onChange={e => onColor(e.target.value)} /></label>
    <label className="field"><span>Steel finish</span><select aria-label={`${label} steel finish`} value={finish} onChange={e => onFinish(e.target.value as FrameFinish)}>
      <option value="paint">Powder coat</option><option value="stainless">Stainless steel</option><option value="clear-grind">Clear grind</option>
    </select></label>
  </fieldset>;
}
export function AppearanceControls({ store }: { store: BuilderStore }) {
  const { doc, resolved, selected } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const physical = resolved.find(r => r.id === selected) ?? resolved.find(r => r.ownerId === selected);
  const appearance = doc.appearance ?? {};
  const update = (patch: Partial<Appearance>) => store.act(() => store.commit({ ...doc, appearance: { ...appearance, ...patch } }));
  const color = appearance.frameColor ?? DEFAULT_FRAME_COLOR;
  return <section aria-label="Rack appearance" className="appearance-controls">
    <h3>Appearance</h3>
    <PaintPicker label="Rack" color={color} finish={appearance.frameFinish ?? 'paint'} onColor={frameColor => update({ frameColor, frameFinish: 'paint' })} onFinish={frameFinish => update({ frameFinish })} />
    <p className="note">Swatches approximate paint colors; custom colors are welcome.</p>
    <label className="field"><span>Hardware finish</span><select aria-label="Hardware finish" value={appearance.hardwareFinish ?? 'chrome'} onChange={e => update({ hardwareFinish: e.target.value as HardwareFinish })}>
      <option value="chrome">Chrome</option><option value="gold">Gold</option><option value="oxide">Oxide (black)</option>
    </select></label>
    {physical && <>
      <PaintPicker label="This piece" color={appearance.overrides?.[physical.id] ?? color}
        finish={appearance.finishOverrides?.[physical.id] ?? (appearance.overrides?.[physical.id] ? 'paint' : appearance.frameFinish ?? 'paint')}
        onColor={value => update({ overrides: { ...appearance.overrides, [physical.id]: value }, finishOverrides: { ...appearance.finishOverrides, [physical.id]: 'paint' } })}
        onFinish={value => update({ finishOverrides: { ...appearance.finishOverrides, [physical.id]: value } })} />
      <p className="note">{physical.id.replaceAll('-', ' ')} · frame surfaces only. Handles, liners and rods keep their original finish.</p>
      <button type="button" disabled={!appearance.overrides?.[physical.id] && !appearance.finishOverrides?.[physical.id]} onClick={() => {
        const overrides = { ...appearance.overrides }, finishOverrides = { ...appearance.finishOverrides };
        delete overrides[physical.id]; delete finishOverrides[physical.id]; update({ overrides, finishOverrides });
      }}>Use rack appearance</button>
    </>}
    <p className="note">Hardware finish applies to bolts and fasteners only. GLB retains brushed materials; 3MF uses their flat dominant color without texture or reflections.</p>
  </section>;
}
