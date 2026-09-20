/** The builder's one shortcut registry (#206). Every key binding the builder, its 3D scene and the parts gallery
 * respond to is declared here, and every handler matches keys through `matches` — so the "?" overlay, which renders
 * this list, can never drift from what the keys actually do. Pure: no DOM beyond event-shaped objects. */

export type ShortcutGroup = 'General' | 'History' | 'Selection' | 'View' | 'Placement' | 'Mouse & touch' | 'Parts gallery';
/** Who handles it: `builder` = the page's single dispatcher (BuilderPage), `scene` = the 3D scene's listeners
 * (builder-scene.ts), `gallery` = inside the parts gallery dialog. Combos must be unique within a scope. */
export type ShortcutScope = 'builder' | 'scene' | 'gallery';
/** `key` is `KeyboardEvent.key` lowercased ('z', 'arrowleft', 'escape', '?'). Modifiers default to "not held";
 * 'any' ignores the modifier. `mod` is ⌘ on macOS and Ctrl elsewhere (either is accepted). */
export interface KeyCombo { key: string; mod?: boolean | 'any'; shift?: boolean | 'any'; alt?: boolean | 'any' }
export interface ShortcutDef {
  id: string; label: string; group: ShortcutGroup; scope: ShortcutScope;
  /** Key presses. Empty for `hold`/`gesture` entries, which only document a modifier or pointer gesture. */
  combos: readonly KeyCombo[];
  /** Display-only keys for gestures and held modifiers ('Alt', 'Double-click'). */
  display?: readonly string[];
  /** Short context note shown in the overlay ("while placing"). */
  when?: string;
  /** Fires while focus is in a text field (Escape, ⌘K). Default: never while typing. */
  typing?: boolean;
  /** Fires even when an earlier handler already called preventDefault (Escape after a widget closed itself). */
  always?: boolean;
}

const plain = (key: string, extra: Omit<KeyCombo, 'key'> = {}): KeyCombo => ({ key, ...extra });
const arrows = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'];

export const SHORTCUTS = [
  // General
  { id: 'command-palette', label: 'Command palette: actions and parts', group: 'General', scope: 'builder', combos: [plain('k', { mod: true })], typing: true },
  { id: 'shortcuts', label: 'Keyboard shortcuts (this list)', group: 'General', scope: 'builder', combos: [plain('?', { shift: 'any' })] },
  { id: 'open-gallery', label: 'Parts gallery: browse and add parts', group: 'General', scope: 'builder', combos: [plain('/', { shift: 'any' }), plain('a', { shift: 'any' })] },
  { id: 'toggle-outliner', label: 'Show or hide the outliner', group: 'General', scope: 'builder', combos: [plain('o')] },
  { id: 'escape', label: 'Cancel placement or drag · clear selection', group: 'General', scope: 'builder', combos: [plain('escape', { shift: 'any', mod: 'any', alt: 'any' })], typing: true, always: true },
  // History
  { id: 'undo', label: 'Undo', group: 'History', scope: 'builder', combos: [plain('z', { mod: true, alt: 'any' })] },
  { id: 'redo', label: 'Redo', group: 'History', scope: 'builder', combos: [plain('z', { mod: true, shift: true, alt: 'any' }), plain('y', { mod: true })] },
  { id: 'history-back', label: 'Step back through history', group: 'History', scope: 'builder', combos: [plain('arrowleft')] },
  { id: 'history-forward', label: 'Step forward through history', group: 'History', scope: 'builder', combos: [plain('arrowright')] },
  { id: 'history-start', label: 'Jump to the first history step', group: 'History', scope: 'builder', combos: [plain('home')] },
  { id: 'history-end', label: 'Jump to the latest history step', group: 'History', scope: 'builder', combos: [plain('end')] },
  // Selection
  { id: 'select-all', label: 'Select all visible, unlocked parts', group: 'Selection', scope: 'builder', combos: [plain('a', { mod: true })] },
  { id: 'delete', label: 'Delete the selection', group: 'Selection', scope: 'builder', combos: [plain('delete', { mod: 'any', shift: 'any' }), plain('backspace', { mod: 'any', shift: 'any' })] },
  { id: 'duplicate', label: 'Duplicate the selected attachments', group: 'Selection', scope: 'builder', combos: [plain('d', { mod: true })] },
  { id: 'hide', label: 'Hide the selection', group: 'Selection', scope: 'builder', combos: [plain('h')] },
  { id: 'show-all', label: 'Show every hidden part', group: 'Selection', scope: 'builder', combos: [plain('h', { shift: true })] },
  { id: 'lock', label: 'Lock or unlock the selection', group: 'Selection', scope: 'builder', combos: [plain('l')] },
  // View
  { id: 'frame-selection', label: 'Frame the selection (or the whole gym)', group: 'View', scope: 'builder', combos: [plain('f')] },
  { id: 'view-iso', label: '3D view', group: 'View', scope: 'builder', combos: [plain('1')] },
  { id: 'view-front', label: 'Front view', group: 'View', scope: 'builder', combos: [plain('2')] },
  { id: 'view-side', label: 'Side view', group: 'View', scope: 'builder', combos: [plain('3')] },
  { id: 'view-top', label: 'Top view', group: 'View', scope: 'builder', combos: [plain('4')] },
  // Placement (the 3D scene's own listeners)
  { id: 'rotate', label: 'Rotate the hovered, selected or placing part', group: 'Placement', scope: 'scene', combos: [plain('r', { alt: 'any' })] },
  { id: 'rotate-back', label: 'Rotate the other way', group: 'Placement', scope: 'scene', combos: [plain('r', { shift: true, alt: 'any' })] },
  { id: 'structure-cycle', label: 'Cycle structure positions', group: 'Placement', scope: 'scene', when: 'adding structure · Shift reverses',
    combos: [...arrows.map(key => plain(key, { shift: 'any', alt: 'any' })), plain('alt', { shift: 'any', alt: 'any' })] },
  { id: 'snap-off', label: 'Hold while dragging or placing to turn off snapping', group: 'Placement', scope: 'scene', combos: [], display: ['Alt'] },
  // Pointer gestures (documented; the scene owns them)
  { id: 'click-select', label: 'Select a part · Shift or ⌘/Ctrl adds to the selection', group: 'Mouse & touch', scope: 'scene', combos: [], display: ['Click', 'Tap'] },
  { id: 'double-click-move', label: 'Pick a part up to move it', group: 'Mouse & touch', scope: 'scene', combos: [], display: ['Double-click'] },
  { id: 'drag-floor', label: 'Drag floor and wall items to move them', group: 'Mouse & touch', scope: 'scene', combos: [], display: ['Drag'] },
  { id: 'scroll-rotate', label: 'Rotate the hovered part', group: 'Mouse & touch', scope: 'scene', combos: [], display: ['Scroll'] },
  { id: 'marquee', label: 'Box-select with the Select tool', group: 'Mouse & touch', scope: 'scene', combos: [], display: ['Drag'] },
  // Parts gallery dialog
  { id: 'gallery-search', label: 'Focus the search', group: 'Parts gallery', scope: 'gallery', combos: [plain('/', { shift: 'any', mod: 'any', alt: 'any' })] },
  { id: 'gallery-move', label: 'Move between parts', group: 'Parts gallery', scope: 'gallery', combos: arrows.map(key => plain(key)) },
  { id: 'gallery-add', label: 'Add the highlighted part', group: 'Parts gallery', scope: 'gallery', combos: [plain('enter', { shift: 'any', mod: 'any', alt: 'any' })] },
  { id: 'gallery-favourite', label: 'Favourite the highlighted part', group: 'Parts gallery', scope: 'gallery', combos: [plain('f', { shift: 'any', alt: 'any' })] },
  { id: 'gallery-close', label: 'Close the gallery', group: 'Parts gallery', scope: 'gallery', combos: [plain('escape', { shift: 'any', mod: 'any', alt: 'any' })] },
] as const satisfies readonly ShortcutDef[];

export type ShortcutId = (typeof SHORTCUTS)[number]['id'];
export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = ['General', 'History', 'Selection', 'View', 'Placement', 'Mouse & touch', 'Parts gallery'];
const byId = new Map<string, ShortcutDef>(SHORTCUTS.map(s => [s.id, s]));
export const shortcut = (id: ShortcutId): ShortcutDef => byId.get(id)!;

/** The event fields shortcuts read (a KeyboardEvent, or a plain object in tests). */
export interface KeyLike { key: string; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }
const held = (want: boolean | 'any' | undefined, got: boolean) => want === 'any' || (want ?? false) === got;
export function comboMatches(combo: KeyCombo, event: KeyLike) {
  return !!event.key && event.key.toLowerCase() === combo.key && held(combo.mod, !!(event.metaKey || event.ctrlKey))
    && held(combo.shift, !!event.shiftKey) && held(combo.alt, !!event.altKey);
}
/** Whether `event` is one of the shortcut's key presses. */
export const matches = (id: ShortcutId, event: KeyLike) => shortcut(id).combos.some(combo => comboMatches(combo, event));
/** Held-modifier shortcuts: Alt turns snapping off. */
export const snapOff = (event: { altKey?: boolean }) => !!event.altKey;

/** Focus is in a text field: plain-key shortcuts must not fire. */
export function isTyping(target: EventTarget | null) {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null;
  return !!element && typeof element.tagName === 'string' && (/^(INPUT|SELECT|TEXTAREA)$/.test(element.tagName) || !!element.isContentEditable);
}
/** Inside a dialog or menu (the gallery, the palette, the export menu): those widgets own their keys. */
export function inWidget(target: EventTarget | null) {
  const element = target as { closest?: (selector: string) => unknown } | null;
  return typeof element?.closest === 'function' && !!element.closest('[role="dialog"],[role="menu"]');
}

/** Timeline arrow/Home/End keys to a history step (the timeline slider and the page share this). */
export function historyKeyStep(event: KeyLike | string, position: number, latest: number) {
  const key = typeof event === 'string' ? { key: event } : event;
  if (matches('history-start', key)) return 0;
  if (matches('history-end', key)) return latest;
  if (matches('history-back', key)) return Math.max(0, position - 1);
  if (matches('history-forward', key)) return Math.min(latest, position + 1);
  return undefined;
}

/** Handler per builder shortcut. Return `false` to decline (the key then falls through, unprevented). */
export type ShortcutHandlers = Partial<Record<ShortcutId, (event: KeyboardEvent) => boolean | void>>;
/** The page's one keydown dispatcher: the first matching builder shortcut whose handler accepts the key wins.
 * Returns the id it ran, for tests. */
export function dispatchShortcut(event: KeyboardEvent, handlers: ShortcutHandlers): ShortcutId | null {
  if (event.isComposing) return null;
  const typing = isTyping(event.target), widget = inWidget(event.target);
  for (const def of SHORTCUTS as readonly ShortcutDef[]) {
    if (def.scope !== 'builder') continue;
    const handler = handlers[def.id as ShortcutId];
    if (!handler || !def.combos.some(combo => comboMatches(combo, event))) continue;
    if ((typing && !def.typing) || (event.defaultPrevented && !def.always) || (widget && !def.always)) continue;
    if (handler(event) === false) continue;
    if (!def.always) event.preventDefault();
    return def.id as ShortcutId;
  }
  return null;
}

/** Display labels. */
export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
const KEY_NAMES: Record<string, string> = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', escape: 'Esc', delete: 'Delete', backspace: '⌫', enter: 'Enter', home: 'Home', end: 'End', ' ': 'Space', alt: 'Alt' };
/** Key caps for one combo: ['⌘', '⇧', 'Z'] on macOS, ['Ctrl', 'Shift', 'Z'] elsewhere. */
export function comboKeys(combo: KeyCombo, mac = isMac()): string[] {
  const keys: string[] = [];
  if (combo.mod === true) keys.push(mac ? '⌘' : 'Ctrl');
  if (combo.alt === true && combo.key !== 'alt') keys.push(mac ? '⌥' : 'Alt');
  if (combo.shift === true) keys.push(mac ? '⇧' : 'Shift');
  keys.push(KEY_NAMES[combo.key] ?? (combo.key === 'alt' ? (mac ? '⌥' : 'Alt') : combo.key.toUpperCase()));
  return keys;
}
export const comboLabel = (combo: KeyCombo, mac = isMac()) => comboKeys(combo, mac).join(mac ? '' : '+');
/** The first combo's label, for menus and tooltips ("⌘Z"). */
export const shortcutLabel = (id: ShortcutId, mac = isMac()) => { const def = shortcut(id); return def.combos[0] ? comboLabel(def.combos[0], mac) : def.display?.[0] ?? ''; };
/** `aria-keyshortcuts` value ("Meta+K Control+K"). */
const ARIA_NAMES: Record<string, string> = { arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', escape: 'Escape', delete: 'Delete', backspace: 'Backspace', enter: 'Enter', home: 'Home', end: 'End', alt: 'Alt' };
export function ariaKeys(id: ShortcutId) {
  const name = (key: string) => ARIA_NAMES[key] ?? key.toUpperCase();
  return shortcut(id).combos.flatMap(c => (c.mod === true ? ['Meta', 'Control'] : [''])
    .map(mod => [mod, c.alt === true ? 'Alt' : '', c.shift === true ? 'Shift' : '', name(c.key)].filter(Boolean).join('+'))).join(' ');
}

/** The overlay: every registry entry, grouped in display order, each with its key caps (alternatives) or gesture. */
export interface OverlayRow { id: ShortcutId; label: string; when?: string; keys: string[][] }
export function overlayGroups(mac = isMac()): { group: ShortcutGroup; rows: OverlayRow[] }[] {
  return SHORTCUT_GROUPS.map(group => ({
    group,
    rows: (SHORTCUTS as readonly ShortcutDef[]).filter(s => s.group === group).map(s => ({
      id: s.id as ShortcutId, label: s.label, when: s.when,
      keys: s.combos.length ? s.combos.map(c => comboKeys(c, mac)) : (s.display ?? []).map(d => [d]),
    })),
  })).filter(g => g.rows.length);
}
/** Pairs of shortcuts in one scope whose combos collide (the registry test keeps this empty). */
export function conflicts(): [string, string][] {
  const out: [string, string][] = [];
  const list = SHORTCUTS as readonly ShortcutDef[];
  const flags = (v: boolean | 'any' | undefined) => v === 'any' ? [false, true] : [v ?? false];
  const overlaps = (a: KeyCombo, b: KeyCombo) => a.key === b.key && (['mod', 'shift', 'alt'] as const).every(m => flags(a[m]).some(x => flags(b[m]).includes(x)));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.scope !== b.scope || a.when !== b.when) continue;
    if (a.combos.some(x => b.combos.some(y => overlaps(x, y)))) out.push([a.id, b.id]);
  }
  return out;
}
