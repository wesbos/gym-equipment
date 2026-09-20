import { useState } from 'react';
import { barStacks, isUneven, setBarLoad, sleeveSpec } from '../../rack-generator/bar-loads.ts';
import type { FloorPart } from '../../rack-generator/floor-registry.ts';
import { plateTotalLabel, type PlateId } from '../../rack-generator/plates.ts';
import type { BarLoad, FloorItem } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { PlateStack } from './PlateStackEditor.tsx';
/** Plates on a bar's sleeves (#160): one stack loaded alike on both sleeves, or each sleeve on its own. Right is the +X
 * sleeve (the lifter's right, facing the rack from the front). Stacks are capped at the loadable sleeve length. */
export function BarPlatesEditor({ store, item, part }: { store: BuilderStore; item: FloorItem; part: FloorPart }) {
  const spec = sleeveSpec(part, item.params), [right, left] = barStacks(item.plates);
  // With nothing loaded, "separately" is just the editor's mode; once plates go on, the document carries it.
  const [wantSplit, setWantSplit] = useState(false), split = item.plates ? isUneven(item.plates) : wantSplit;
  const commit = (load: BarLoad | undefined, label: string) => store.commit(setBarLoad(store.getSnapshot().doc, item.id, load), { category: 'edit', label });
  const toggle = (on: boolean) => {
    setWantSplit(on);
    if (item.plates) store.act(() => commit(on ? { right, left } : { both: right }, on ? 'Load sleeves separately' : 'Load both sleeves alike'));
  };
  const stack = (plates: PlateId[], apply: (next: PlateId[], label: string) => void, props: { legend: string; idPrefix: string; labelPrefix?: string; suffix?: string }) =>
    <PlateStack key={props.idPrefix} plates={plates} capacity={spec.sleeveLength} meter={`${props.labelPrefix ?? 'Sleeve'} length used`} apply={apply} {...props} />;
  return <div className="bar-plates" id="bar-plates">
    <label className="field"><span>Load each sleeve separately</span><input type="checkbox" aria-label="Load each sleeve separately" checked={split} onChange={e => toggle(e.currentTarget.checked)} /></label>
    {split ? <>
      {stack(right, (next, label) => commit({ right: next, left }, `Right sleeve: ${label.toLowerCase()}`), { legend: 'Right sleeve plates', idPrefix: 'bar-plates-right', labelPrefix: 'Right sleeve' })}
      {stack(left, (next, label) => commit({ right, left: next }, `Left sleeve: ${label.toLowerCase()}`), { legend: 'Left sleeve plates', idPrefix: 'bar-plates-left', labelPrefix: 'Left sleeve' })}
    </> : stack(right, (next, label) => commit({ both: next }, label), { legend: 'Plates on each sleeve', idPrefix: 'bar-plates-both', suffix: ' on each sleeve' })}
    {!!item.plates && <p className="note" id="bar-plates-total">Plates on the bar: {plateTotalLabel([...right, ...left])}</p>}
  </div>;
}
