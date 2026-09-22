import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BuilderStore } from '../../state/builder-store.ts';
import type { BuilderScene } from '../../scenes/builder-scene.ts';
import { useStoreSelector } from '../../state/use-store.ts';
import { barActions, sameActions, variantOptions } from '../../state/selection-actions.ts';
import { removeSelectionWithUndo } from '../Toast/undo-actions.ts';
import { PartThumbnail } from '../PartThumbnail.tsx';
import { partMeta } from '../Inspector/part-meta.ts';
import { Icon, type IconName } from './icons.tsx';
import { shortcutLabel } from '../../state/shortcuts.ts';
import { isPhoneLayout, useLayoutMode } from '../MobileShell/index.ts';
import './selection-bar.css';


function BarButton({ icon, label, shortcut, onClick, pressed, danger, children }: { icon: IconName; label: string; shortcut?: string; onClick: () => void; pressed?: boolean; danger?: boolean; children?: string }) {
  return <button type="button" className={`sb-button${danger ? ' sb-danger' : ''}`} aria-label={label} title={shortcut ? `${label} (${shortcut})` : label}
    aria-pressed={pressed} onClick={onClick}><Icon name={icon} /><span className="sb-label">{children ?? label}</span></button>;
}

function SwapMenu({ store, id, close }: { store: BuilderStore; id: string; close: () => void }) {
  const { doc, resolved, definitions, part } = useStoreSelector(store, s => ({ doc: s.doc, resolved: s.resolved, definitions: s.definitions, part: s.resolved.find(r => r.id === id)?.part }),
    (a, b) => a.doc === b.doc && a.definitions === b.definitions && a.part === b.part);
  const variants = variantOptions(doc, resolved, id);
  const menu = useRef<HTMLDivElement>(null);
  // Open towards the larger space around the bar, capped to it.
  useLayoutEffect(() => {
    const el = menu.current!, bar = el.closest('.selection-bar')!.getBoundingClientRect();
    const above = bar.top - 16, below = window.innerHeight - bar.bottom - 16, up = above > below;
    el.dataset.side = up ? 'above' : 'below';
    el.style.maxHeight = `${Math.max(160, Math.min(360, up ? above : below))}px`;
  }, []);
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"], [role="menuitemradio"]')?.focus();
    const away = (e: PointerEvent) => { if (!menu.current?.parentElement?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', key, true); };
  }, [close]);
  return <div ref={menu} className="sb-menu" role="menu" aria-label="Swap variant" onKeyDown={e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...menu.current!.querySelectorAll<HTMLElement>('[role="menuitemradio"]')], i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  }}>
    {variants.map(v => { const meta = partMeta(v, definitions); return <button type="button" key={v} role="menuitemradio" aria-checked={v === part} className="sb-menu-item"
      onClick={() => { if (v !== part) store.act(() => store.swapSelectedVariant(v)); close(); }}>
      <PartThumbnail part={v} className="sb-menu-thumb" /><span><strong>{meta.name}</strong><small>{meta.brand}</small></span>
    </button>; })}
  </div>;
}

/** Floating selection actions (#205): follows the selection on screen (positioned imperatively from the scene's
 * frame callback, so orbiting and dragging never re-render React), docks above the bottom sheet on phones.
 * Only the actions that apply to the selected kind are shown. */
export function SelectionBar({ store, scene }: { store: BuilderStore; scene: BuilderScene | null }) {
  const actions = useStoreSelector(store, barActions, sameActions);
  const bar = useRef<HTMLDivElement>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const visible = actions.kind !== 'none' && actions.kind !== 'room';
  // Phones (#203 shell): docked along the bottom of the stage overlay, which ends above the sheet.
  const docked = isPhoneLayout(useLayoutMode());
  useEffect(() => setSwapOpen(false), [actions.id, actions.part, visible]);
  useLayoutEffect(() => {
    const el = bar.current;
    if (!el || !scene || !visible) return;
    if (docked) { el.style.transform = ''; el.dataset.placement = 'docked'; return; }
    let last = '';
    const place = () => {
      const bounds = scene.selectionScreenBounds();
      if (!bounds) { if (last !== 'off') el.dataset.placement = last = 'off'; return; }
      const { viewport } = bounds, width = el.offsetWidth, height = el.offsetHeight, margin = 10, gap = 14;
      // Stay clear of the floating outliner (#206) on the stage's right when there is room beside it.
      const outliner = el.ownerDocument.querySelector('.stage .outliner:not(.ol-sheet)')?.getBoundingClientRect();
      const v = outliner && outliner.left - viewport.left > width + 2 * margin ? { ...viewport, right: Math.min(viewport.right, outliner.left) } : viewport;
      let y = bounds.top - height - gap, placement = 'above';
      if (y < v.top + margin) { y = bounds.bottom + gap; placement = 'below'; }
      if (y + height > v.bottom - margin) { y = Math.max(v.top + margin, Math.min(bounds.top, v.bottom - height - margin)); placement = 'inside'; }
      const x = Math.round(Math.min(v.right - width - margin, Math.max(v.left + margin, (bounds.left + bounds.right - width) / 2)));
      const key = `${x},${Math.round(y)},${placement}`;
      if (key === last) return;
      last = key;
      el.style.transform = `translate3d(${x}px,${Math.round(y)}px,0)`;
      el.dataset.placement = placement;
    };
    place();
    // The selection outline for a fresh selection is drawn on the next frame; that frame places the bar.
    scene.invalidate();
    return scene.onFrame(place);
  }, [scene, visible, docked, actions.kind, actions.count, actions.rotate, actions.swap, actions.pair, actions.duplicate, actions.move, actions.lock]);
  if (!visible) return null;
  const { kind, count, id, rotate } = actions;
  const name = id && actions.part ? partMeta(actions.part, store.getSnapshot().definitions).name : `${count} parts`;
  return <div ref={bar} className="selection-bar" role="toolbar" aria-label={`Selection actions: ${name}`} data-kind={kind} data-placement="pending">
    {kind === 'multi' && <span className="sb-count" aria-hidden="true">{count}</span>}
    {actions.move && <BarButton icon="move" label={kind === 'structure' ? 'Move in plan' : 'Move'} shortcut="double-click" onClick={() => { store.repositionSelected(); }} />}
    {rotate === 15 && <>
      <BarButton icon="rotateLeft" label="Rotate −15°" shortcut={shortcutLabel('rotate-back')} onClick={() => store.act(() => store.rotateSelection(-1))}>−15°</BarButton>
      <BarButton icon="rotateRight" label="Rotate +15°" shortcut={shortcutLabel('rotate')} onClick={() => store.act(() => store.rotateSelection(1))}>+15°</BarButton>
    </>}
    {rotate > 0 && rotate !== 15 && <BarButton icon={rotate >= 90 ? 'flip' : 'rotateRight'} label={`Rotate ${rotate}°`} shortcut={shortcutLabel('rotate')} onClick={() => store.act(() => store.rotateSelection(1))}>{`${rotate}°`}</BarButton>}
    {actions.duplicate && <BarButton icon="duplicate" label="Duplicate" shortcut={shortcutLabel('duplicate')} onClick={() => store.act(() => { store.duplicateSelected(); })} />}
    {actions.swap && <span className="sb-swap">
      <BarButton icon="swap" label="Swap variant" pressed={swapOpen} onClick={() => setSwapOpen(!swapOpen)}>Swap</BarButton>
      {swapOpen && <SwapMenu store={store} id={id!} close={() => setSwapOpen(false)} />}
    </span>}
    {actions.pair && <BarButton icon={actions.pair === 'unpair' ? 'unpair' : 'pair'} label={actions.pair === 'unpair' ? 'Split pair' : 'Add matching pair'}
      onClick={() => store.act(store.togglePairSelected)}>{actions.pair === 'unpair' ? 'Unpair' : 'Pair'}</BarButton>}
    {actions.lock && <BarButton icon={actions.lock === 'unlock' ? 'lock' : 'unlock'} pressed={actions.lock === 'unlock'}
      label={actions.lock === 'unlock' ? 'Unlock selection' : 'Lock selection'} shortcut={shortcutLabel('lock')}
      onClick={() => store.setLocked(store.getSnapshot().selection, actions.lock === 'lock')}>{actions.lock === 'unlock' ? 'Locked' : 'Lock'}</BarButton>}
    {actions.focus && <BarButton icon="focus" label="Focus selection" shortcut={shortcutLabel('frame-selection')} onClick={() => scene?.focus(store.getSnapshot().selection)}>Focus</BarButton>}
    <span className="sb-divider" aria-hidden="true" />
    {actions.remove && <BarButton icon="delete" danger label={kind === 'multi' ? `Delete ${count} parts` : 'Delete selection'} shortcut={shortcutLabel('delete')} onClick={() => removeSelectionWithUndo(store)}>Delete</BarButton>}
    {kind === 'multi' && <BarButton icon="close" label="Clear selection" shortcut="Esc" onClick={() => store.select(null)}>Clear</BarButton>}
  </div>;
}
