import { ResetButton } from './ResetButton.tsx';
import { useSyncExternalStore } from 'react';
import { DEFAULT_FRAME_COLOR, PAINT_SWATCHES, resolveMaterial, type Appearance, type FrameFinish, type HardwareFinish } from '../../rack-generator/appearance.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import './appearance-controls.css';

function PaintPicker({ label, color, mixedColor = false, finish, onColor, onFinish, colorChanged, finishChanged, onResetColor, onResetFinish }: {
  label: string; color: string; mixedColor?: boolean; finish: FrameFinish | '';
  onColor(color: string): void; onFinish(finish: FrameFinish): void;
  colorChanged: boolean; finishChanged: boolean; onResetColor(): void; onResetFinish(): void;
}) {
  return <fieldset className="paint-picker"><legend>{label}</legend>
    <div className="paint-swatches">{PAINT_SWATCHES.map(([name, hex]) =>
      <button key={name} type="button" title={name} aria-label={`${label}: ${name}`} aria-pressed={!mixedColor && finish === 'paint' && color === hex} onClick={() => onColor(hex)}>
        <span style={{ background: hex }} />{name}
      </button>)}</div>
    <label className="field"><span>Custom color{mixedColor ? ' · Mixed' : ''}</span><input aria-label={`${label} color`} type="color" value={color} onChange={e => onColor(e.target.value)} /><ResetButton label={`${label} color`} changed={colorChanged} onReset={onResetColor} /></label>
    <label className="field"><span>Steel finish</span><select aria-label={`${label} steel finish`} value={finish} onChange={e => onFinish(e.target.value as FrameFinish)}>
      {finish === '' && <option value="" disabled>Mixed</option>}
      <option value="paint">Powder coat</option><option value="stainless">Stainless steel</option><option value="clear-grind">Clear grind</option>
    </select><ResetButton label={`${label} steel finish`} changed={finishChanged} onReset={onResetFinish} /></label>
  </fieldset>;
}
export function AppearanceControls({ store }: { store: BuilderStore }) {
  const { doc, resolved, selected, selection } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const physical = resolved.find(r => r.id === selected) ?? resolved.find(r => r.ownerId === selected);
  const appearance = doc.appearance ?? {};
  const update = (patch: Partial<Appearance>) => store.act(() => store.commit({ ...doc, appearance: { ...appearance, ...patch } }));
  const colors = selection.map(id => appearance.overrides?.[id] ?? appearance.frameColor ?? DEFAULT_FRAME_COLOR);
  const mixed = colors.some(value => value !== colors[0]);
  const finishes = selection.map(id => resolveMaterial({ role: 'frame' }, appearance, id).finish ?? 'paint');
  const mixedFinish = finishes.some(value => value !== finishes[0]);
  const color = appearance.frameColor ?? DEFAULT_FRAME_COLOR;
  return <section aria-label="Rack appearance" className="appearance-controls">
    <h3>Appearance</h3>
    {selection.length < 2 && <>
    <PaintPicker label="Rack" color={color} finish={appearance.frameFinish ?? 'paint'} onColor={frameColor => update({ frameColor, frameFinish: 'paint' })} onFinish={frameFinish => update({ frameFinish })}
      colorChanged={color !== DEFAULT_FRAME_COLOR} onResetColor={() => update({ frameColor: DEFAULT_FRAME_COLOR })}
      finishChanged={!!appearance.frameFinish && appearance.frameFinish !== 'paint'} onResetFinish={() => update({ frameFinish: 'paint' })} />
    <ResetButton label="rack appearance" changed={color !== DEFAULT_FRAME_COLOR || !!appearance.frameFinish && appearance.frameFinish !== 'paint'} onReset={() => update({ frameColor: DEFAULT_FRAME_COLOR, frameFinish: 'paint' })} />
    <label className="field"><span>Fastener finish</span><select aria-label="Fastener finish" value={appearance.hardwareFinish ?? 'chrome'} onChange={e => update({ hardwareFinish: e.target.value as HardwareFinish })}>
      <option value="chrome">Chrome</option><option value="gold">Gold</option><option value="oxide">Oxide (black)</option>
    </select><ResetButton label="hardware finish" changed={!!appearance.hardwareFinish && appearance.hardwareFinish !== 'chrome'} onReset={() => update({ hardwareFinish: undefined })} /></label>
    </>}
    {physical && <>
      {selection.length > 1 ? <>
        <PaintPicker label="Selected pieces" color={mixed ? '#808080' : colors[0] ?? color} mixedColor={mixed}
          finish={mixedFinish ? '' : finishes[0] ?? 'paint'}
          onColor={value => store.act(() => store.paintSelection(value))}
          onFinish={value => store.act(() => store.finishSelection(value))}
          colorChanged={selection.some(id => !!appearance.overrides?.[id])}
          onResetColor={() => store.act(() => store.paintSelection())}
          finishChanged={selection.some(id => !!appearance.finishOverrides?.[id])}
          onResetFinish={() => store.act(() => store.finishSelection())} />
        <button type="button" disabled={!selection.some(id => appearance.overrides?.[id] || appearance.finishOverrides?.[id])}
          onClick={() => store.act(store.resetSelectionAppearance)}>Use rack appearance</button>
      </> : <>
      <p className="note">{physical.id.replaceAll('-', ' ')}</p>
      <PaintPicker label="This piece" color={appearance.overrides?.[physical.id] ?? color}
        finish={appearance.finishOverrides?.[physical.id] ?? (appearance.overrides?.[physical.id] ? 'paint' : appearance.frameFinish ?? 'paint')}
        onColor={value => update({ overrides: { ...appearance.overrides, [physical.id]: value }, finishOverrides: { ...appearance.finishOverrides, [physical.id]: 'paint' } })}
        onFinish={value => update({ finishOverrides: { ...appearance.finishOverrides, [physical.id]: value } })}
        colorChanged={!!appearance.overrides?.[physical.id]} onResetColor={() => {
          const overrides = { ...appearance.overrides }; delete overrides[physical.id]; update({ overrides });
        }}
        finishChanged={!!appearance.finishOverrides?.[physical.id]} onResetFinish={() => {
          const finishOverrides = { ...appearance.finishOverrides }; delete finishOverrides[physical.id]; update({ finishOverrides });
        }} />
      <button type="button" disabled={!appearance.overrides?.[physical.id] && !appearance.finishOverrides?.[physical.id]} onClick={() => {
        const overrides = { ...appearance.overrides }, finishOverrides = { ...appearance.finishOverrides };
        delete overrides[physical.id]; delete finishOverrides[physical.id]; update({ overrides, finishOverrides });
      }}>Use rack appearance</button>
      </>}

    </>}
  </section>;
}
