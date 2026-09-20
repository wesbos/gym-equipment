import { physicalFinish, resetAppearanceField } from '../../rack-generator/appearance-reset.ts';
import { ResetButton } from './ResetButton.tsx';
import { GestureColorInput, type GestureCallbacks } from './GestureInputs.tsx';
import { deepEqual, useStoreSelector } from '../state/use-store.ts';
import { DEFAULT_FRAME_COLOR, PAINT_SWATCHES, type Appearance, type FrameFinish, type HardwareFinish } from '../../rack-generator/appearance.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import './appearance-controls.css';

function PaintPicker({ label, color, mixedColor = false, finish, onColor, onFinish, colorChanged, finishChanged, onResetColor, onResetFinish, ...gesture }: GestureCallbacks & {
  label: string; color: string; mixedColor?: boolean; finish: FrameFinish | '';
  onColor(color: string): void; onFinish(finish: FrameFinish): void;
  colorChanged: boolean; finishChanged: boolean; onResetColor(): void; onResetFinish(): void;
}) {
  return <fieldset className="paint-picker"><legend>{label}</legend>
    <div className="paint-swatches">{PAINT_SWATCHES.map(([name, hex]) =>
      <button key={name} type="button" title={name} aria-label={`${label}: ${name}`} aria-pressed={!mixedColor && finish === 'paint' && color === hex} onClick={() => onColor(hex)}>
        <span style={{ background: hex }} />{name}
      </button>)}</div>
    <label className="field"><span>Custom color{mixedColor ? ' · Mixed' : ''}</span><GestureColorInput aria-label={`${label} color`} value={color} onValue={onColor} {...gesture} /><ResetButton label={`${label} color`} changed={colorChanged} onReset={onResetColor} /></label>
    <label className="field"><span>Steel finish</span><select aria-label={`${label} steel finish`} value={finish} onChange={e => onFinish(e.target.value as FrameFinish)}>
      {finish === '' && <option value="" disabled>Mixed</option>}
      <option value="paint">Powder coat</option><option value="stainless">Stainless steel</option><option value="clear-grind">Clear grind</option>
    </select><ResetButton label={`${label} steel finish`} changed={finishChanged} onReset={onResetFinish} /></label>
  </fieldset>;
}
export function AppearanceControls({ store }: { store: BuilderStore }) {
  // Only the appearance, the selection and the selected piece's identity: moving a part must not re-render the pickers.
  const { appearance = {}, selection, physical } = useStoreSelector(store, ({ doc, resolved, selected, selection }) => {
    const found = resolved.find(r => r.id === selected) ?? resolved.find(r => r.ownerId === selected);
    return { appearance: doc.appearance, selection, physical: found && { id: found.id, kind: found.kind } };
  }, deepEqual);
  const update = (change: Partial<Appearance> | ((current: Appearance) => Appearance)) => store.act(() => store.edit(current => ({ ...current, appearance: typeof change === 'function' ? change(current.appearance ?? {}) : { ...current.appearance, ...change } })));
  const colors = selection.map(id => appearance.overrides?.[id] ?? appearance.frameColor ?? (id.startsWith('floor-') ? '#353739' : DEFAULT_FRAME_COLOR));
  const mixed = colors.some(value => value !== colors[0]);
  const finishes = selection.map(id => physicalFinish(appearance, id));
  const mixedFinish = finishes.some(value => value !== finishes[0]);
  const color = appearance.frameColor ?? DEFAULT_FRAME_COLOR;
  // Swatches stay discrete commits; only custom-color drags are bracketed.
  const gesture: GestureCallbacks = { onGestureStart: store.beginGesture, onGestureEnd: store.endGesture, onGestureCancel: store.cancelGesture };
  return <section aria-label="Rack appearance" className="appearance-controls">
    <h3>Appearance</h3>
    {selection.length < 2 && <>
    <PaintPicker {...gesture} label="Rack" color={color} finish={appearance.frameFinish ?? 'paint'} onColor={frameColor => update({ frameColor, frameFinish: 'paint' })} onFinish={frameFinish => update({ frameFinish })}
      colorChanged={color !== DEFAULT_FRAME_COLOR} onResetColor={() => update(current => resetAppearanceField(current, 'color'))}
      finishChanged={!!appearance.frameFinish && appearance.frameFinish !== 'paint'} onResetFinish={() => update(current => resetAppearanceField(current, 'finish'))} />
    <ResetButton label="rack appearance" changed={color !== DEFAULT_FRAME_COLOR || !!appearance.frameFinish && appearance.frameFinish !== 'paint'} onReset={() => update({ frameColor: DEFAULT_FRAME_COLOR, frameFinish: 'paint' })} />
    <label className="field"><span>Fastener finish</span><select aria-label="Fastener finish" value={appearance.hardwareFinish ?? ''} onChange={e => update({ hardwareFinish: e.target.value ? e.target.value as HardwareFinish : undefined })}>
      <option value="">Original finishes</option><option value="chrome">Chrome</option><option value="gold">Gold</option><option value="oxide">Oxide (black)</option>
    </select><ResetButton label="hardware finish" changed={!!appearance.hardwareFinish} onReset={() => update({ hardwareFinish: undefined })} /></label>
    </>}
    {physical && <>
      {selection.length > 1 ? <>
        <PaintPicker {...gesture} label="Selected pieces" color={mixed ? '#808080' : colors[0] ?? color} mixedColor={mixed}
          finish={mixedFinish ? '' : finishes[0] ?? 'paint'}
          onColor={value => store.act(() => store.paintSelection(value))}
          onFinish={value => store.act(() => store.finishSelection(value))}
          colorChanged={selection.some(id => !!appearance.overrides?.[id])}
          onResetColor={() => store.act(() => store.paintSelection())}
          finishChanged={finishes.some(finish => finish !== (appearance.frameFinish ?? 'paint'))}
          onResetFinish={() => store.act(() => store.finishSelection())} />
        <button type="button" disabled={!selection.some(id => appearance.overrides?.[id] || appearance.finishOverrides?.[id])}
          onClick={() => store.act(store.resetSelectionAppearance)}>Use rack appearance</button>
      </> : <>
      <p className="note">{physical.id.replaceAll('-', ' ')}</p>
      <PaintPicker {...gesture} label="This piece" color={appearance.overrides?.[physical.id] ?? appearance.frameColor ?? (physical.kind === 'floor-item' ? '#353739' : DEFAULT_FRAME_COLOR)}
        finish={physicalFinish(appearance, physical.id)}
        onColor={value => update(current => ({ ...current, overrides: { ...current.overrides, [physical.id]: value }, finishOverrides: { ...current.finishOverrides, [physical.id]: 'paint' } }))}
        onFinish={value => update(current => ({ ...current, finishOverrides: { ...current.finishOverrides, [physical.id]: value } }))}
        colorChanged={!!appearance.overrides?.[physical.id]} onResetColor={() => update(current => resetAppearanceField(current, 'color', physical.id))}
        finishChanged={physicalFinish(appearance, physical.id) !== (appearance.frameFinish ?? 'paint')} onResetFinish={() => update(current => resetAppearanceField(current, 'finish', physical.id))} />
      <button type="button" disabled={!appearance.overrides?.[physical.id] && !appearance.finishOverrides?.[physical.id]} onClick={() => {
        update(current => {
          const overrides = { ...current.overrides }, finishOverrides = { ...current.finishOverrides };
          delete overrides[physical.id]; delete finishOverrides[physical.id]; return { ...current, overrides, finishOverrides };
        });
      }}>Use rack appearance</button>
      </>}

    </>}
  </section>;
}
