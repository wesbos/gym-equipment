import { useState } from 'react';
import { ResetButton } from './ResetButton.tsx';
import { NumericControl } from './NumericControl.tsx';
import { GestureColorInput } from './GestureInputs.tsx';
import { deepEqual, useStoreSelector } from '../state/use-store.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { roomOf } from '../../rack-generator/wall-items.ts';
import { ROOM_DEFAULTS, ROOM_LIMITS, wallFrames, WALL_IDS, type WallId } from '../../rack-generator/walls.ts';
import {
  DEFAULT_CEILING_COLOR, DEFAULT_WALL_COLOR, FLOOR_FINISHES, FLOOR_FINISH_LABELS, LIGHT_LIMITS, TURF_LIMITS, WAINSCOT_DEFAULT, WAINSCOT_LIMITS,
  TURF_TEXT, TURF_TEXT_ROTATIONS, type TurfTextRotation, WALL_FINISHES, WALL_FINISH_LABELS, WALL_PAINTS, type FloorFinish, type RoomCeiling, type TurfLane, type WallFinish, type WallSurface,
} from '../../rack-generator/room-finishes.ts';
import './appearance-controls.css';

const CEILING_PAINTS: readonly [string, string][] = [['White', '#f4f4f1'], ['Grey', '#b9bcbb'], ['Black', '#1c1d1f']];

function Swatches({ label, paints, value, onValue }: { label: string; paints: readonly [string, string][]; value: string; onValue(color: string): void }) {
  return <div className="paint-swatches">{paints.map(([name, hex]) =>
    <button key={name} type="button" title={name} aria-label={`${label}: ${name}`} aria-pressed={value === hex} onClick={() => onValue(hex)}>
      <span style={{ background: hex }} />{name}
    </button>)}</div>;
}

/** Room finishes (#200): walls, floor, turf lanes, ceiling and the room size. Every change is one history entry;
 * colour pickers and number drags are bracketed so a drag lands as one step. */
export function RoomInspector({ store }: { store: BuilderStore }) {
  const room = useStoreSelector(store, s => roomOf(s.doc), deepEqual);
  const gesture = { onGestureStart: store.beginGesture, onGestureEnd: store.endGesture };
  const colorGesture = { ...gesture, onGestureCancel: store.cancelGesture };
  const edit = (patch: Parameters<BuilderStore['setRoomFinish']>[0]) => store.act(() => store.setRoomFinish(patch));
  // Walls edit every wall at once, or one wall's override (its own finish) when a single wall is picked.
  const [target, setTarget] = useState<'all' | WallId>('all');
  const walls = room.walls, own = target === 'all' ? undefined : walls?.overrides?.[target];
  const shown: WallSurface | undefined = target === 'all' ? walls : own ?? walls;
  const painted = shown?.finish === 'drywall' || shown?.finish === 'wainscot';
  const setSurface = (surface: WallSurface | null) => {
    if (target === 'all') return edit({ walls: surface ? { ...surface, ...(walls?.overrides ? { overrides: walls.overrides } : {}) } : null });
    const { overrides = {}, ...base } = walls ?? { finish: 'slat' as const }, next = { ...overrides };
    if (surface) next[target] = surface; else delete next[target];
    edit({ walls: { ...base, ...(Object.keys(next).length ? { overrides: next } : {}) } });
  };
  const setWalls = (finish: WallFinish | '') => setSurface(finish ? {
    finish,
    ...(finish === 'drywall' || finish === 'wainscot' ? { color: shown?.color ?? DEFAULT_WALL_COLOR } : {}),
    ...(finish === 'wainscot' ? { wainscot: shown?.wainscot ?? Math.min(WAINSCOT_DEFAULT, room.height - 300) } : {}),
  } : null);
  const surface: WallSurface = shown ? { finish: shown.finish, ...(shown.color ? { color: shown.color } : {}), ...(shown.wainscot !== undefined ? { wainscot: shown.wainscot } : {}) } : { finish: 'slat' };
  const wallName = (id: WallId) => wallFrames(room)[id].label;
  const turf = room.turf ?? [];
  const setTurf = (lanes: TurfLane[]) => edit({ turf: lanes.length ? lanes : null });
  const lane = (i: number, patch: Partial<TurfLane>) => setTurf(turf.map((l, j) => j === i ? { ...l, ...patch } : l));
  const addLane = () => {
    // A 1.8 m lane down the room's long axis, 1 m in from the left (or back) wall.
    const alongX = room.left + room.right > room.back + room.front, length = Math.max(TURF_LIMITS.size[0], Math.min(10000, (alongX ? room.left + room.right : room.back + room.front) - 1000));
    setTurf([...turf, alongX
      ? { position: [(room.right - room.left) / 2, -room.back + 1900], size: [length, 1800], lines: true }
      : { position: [-room.left + 1900, (room.front - room.back) / 2], size: [1800, length], lines: true }]);
  };
  const ceiling = room.ceiling;
  const setCeiling = (next: RoomCeiling | null) => edit({ ceiling: next });
  const changed = !!(walls || room.floor || turf.length || ceiling);
  return <>
    <h2 id="selection-title">Room</h2>
    <div id="inspector" className="inspector-fields room-inspector">
      <fieldset className="paint-picker"><legend>Walls</legend>
        <label className="field"><span>Edit</span>
          <select aria-label="Walls to edit" value={target} onChange={e => setTarget(e.target.value as 'all' | WallId)}>
            <option value="all">All walls</option>
            {WALL_IDS.map(id => <option key={id} value={id}>{wallName(id)}{walls?.overrides?.[id] ? ' · own finish' : ''}</option>)}
          </select>
        </label>
        <label className="field"><span>{target === 'all' ? 'Wall finish' : `${wallName(target)} finish`}</span>
          <select aria-label="Wall finish" value={(target === 'all' ? walls?.finish : own?.finish) ?? ''} onChange={e => setWalls(e.target.value as WallFinish | '')}>
            <option value="">{target === 'all' ? 'Default · black slats with wall parts' : `Same as the room (${WALL_FINISH_LABELS[walls?.finish ?? 'slat']})`}</option>
            {WALL_FINISHES.map(f => <option key={f} value={f}>{WALL_FINISH_LABELS[f]}</option>)}
          </select>
          <ResetButton label="wall finish" changed={target === 'all' ? !!walls : !!own} onReset={() => setWalls('')} />
        </label>
        {painted && (target === 'all' || own) && <>
          <Swatches label="Wall paint" paints={WALL_PAINTS} value={surface.color ?? DEFAULT_WALL_COLOR} onValue={color => setSurface({ ...surface, color })} />
          <label className="field"><span>{surface.finish === 'wainscot' ? 'Paint above the wainscot' : 'Paint colour'}</span>
            <GestureColorInput aria-label="Wall paint colour" value={surface.color ?? DEFAULT_WALL_COLOR} onValue={color => setSurface({ ...surface, color })} {...colorGesture} />
          </label>
        </>}
        {surface.finish === 'wainscot' && (target === 'all' || own) && <label className="field"><span>Wainscot height (mm)</span>
          <NumericControl label="Wainscot height" value={surface.wainscot ?? WAINSCOT_DEFAULT} min={WAINSCOT_LIMITS[0]} max={Math.min(WAINSCOT_LIMITS[1], room.height - 100)} step={10}
            defaultValue={WAINSCOT_DEFAULT} {...gesture} onValue={v => setSurface({ ...surface, wainscot: v })} />
        </label>}
        {target !== 'all' && !own && <p className="note">This wall follows the room. Pick a finish to give it its own.</p>}
      </fieldset>
      <fieldset className="paint-picker"><legend>Floor</legend>
        <label className="field"><span>Floor finish</span>
          <select aria-label="Floor finish" value={room.floor ?? 'black-rubber'} onChange={e => edit({ floor: e.target.value === 'black-rubber' ? null : e.target.value as FloorFinish })}>
            {FLOOR_FINISHES.map(f => <option key={f} value={f}>{FLOOR_FINISH_LABELS[f]}{f === 'black-rubber' ? ' (default)' : ''}</option>)}
          </select>
          <ResetButton label="floor finish" changed={!!room.floor} onReset={() => edit({ floor: null })} />
        </label>
        {turf.map((l, i) => <fieldset key={i} className="paint-picker turf-lane"><legend>Turf lane {i + 1}</legend>
          <label className="field"><span>Centre x (mm)</span><NumericControl label={`Turf lane ${i + 1} x`} value={l.position[0]} min={-room.left} max={room.right} step={50} {...gesture} onValue={v => lane(i, { position: [v, l.position[1]] })} /></label>
          <label className="field"><span>Centre z (mm)</span><NumericControl label={`Turf lane ${i + 1} z`} value={l.position[1]} min={-room.back} max={room.front} step={50} {...gesture} onValue={v => lane(i, { position: [l.position[0], v] })} /></label>
          <label className="field"><span>Width, x (mm)</span><NumericControl label={`Turf lane ${i + 1} width`} value={l.size[0]} min={TURF_LIMITS.size[0]} max={Math.max(TURF_LIMITS.size[0], room.left + room.right)} step={50} {...gesture} onValue={v => lane(i, { size: [v, l.size[1]] })} /></label>
          <label className="field"><span>Length, z (mm)</span><NumericControl label={`Turf lane ${i + 1} length`} value={l.size[1]} min={TURF_LIMITS.size[0]} max={Math.max(TURF_LIMITS.size[0], room.back + room.front)} step={50} {...gesture} onValue={v => lane(i, { size: [l.size[0], v] })} /></label>
          <label className="field"><span>Stencil text (capitals)</span>
            <input key={l.text ?? ''} aria-label={`Turf lane ${i + 1} stencil text`} defaultValue={l.text ?? ''} maxLength={16} placeholder="e.g. PLAE"
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              onBlur={e => { const text = e.currentTarget.value.toUpperCase().trim(); if (text === (l.text ?? '')) return; if (text && !TURF_TEXT.test(text)) { store.status('Turf text: capitals, digits, spaces and & . ! - only.', true); return; }
                const { text: _old, ...rest } = l; setTurf(turf.map((x, j) => j === i ? (text ? { ...rest, text } : rest) : x)); }} />
          </label>
          <label className="field"><span>Stencil direction</span>
            <select aria-label={`Turf lane ${i + 1} stencil direction`} value={l.textRotation ?? 0} onChange={e => { const turn = Number(e.target.value) as TurfTextRotation, { textRotation: _old, ...rest } = l; setTurf(turf.map((x, j) => j === i ? (turn ? { ...rest, textRotation: turn } : rest) : x)); }}>
              {TURF_TEXT_ROTATIONS.map(r => <option key={r} value={r}>{['Across the lane', 'Along, turned left', 'Across, upside down', 'Along, turned right'][r / 90]}</option>)}
            </select>
          </label>
          <label className="field"><span>Hash marks</span><input type="checkbox" aria-label={`Turf lane ${i + 1} hash marks`} checked={!!l.lines} onChange={e => lane(i, { lines: e.target.checked })} /></label>
          <button type="button" className="danger" onClick={() => setTurf(turf.filter((_, j) => j !== i))}>Remove turf lane {i + 1}</button>
        </fieldset>)}
        {turf.length < TURF_LIMITS.lanes && <button type="button" onClick={addLane}>Add turf lane</button>}
      </fieldset>
      <fieldset className="paint-picker"><legend>Ceiling</legend>
        <label className="field"><span>Ceiling</span><input type="checkbox" aria-label="Ceiling" checked={!!ceiling} onChange={e => setCeiling(e.target.checked ? {} : null)} /></label>
        {ceiling && <>
          <Swatches label="Ceiling paint" paints={CEILING_PAINTS} value={ceiling.color ?? DEFAULT_CEILING_COLOR} onValue={color => setCeiling({ ...ceiling, color })} />
          <label className="field"><span>Ceiling colour</span>
            <GestureColorInput aria-label="Ceiling colour" value={ceiling.color ?? DEFAULT_CEILING_COLOR} onValue={color => setCeiling({ ...ceiling, color })} {...colorGesture} />
          </label>
          <label className="field"><span>Linear LED rows</span>
            <NumericControl label="Linear LED rows" value={ceiling.lights?.count ?? 0} min={0} max={LIGHT_LIMITS[1]} step={1} defaultValue={0} {...gesture}
              onValue={v => { const { lights, ...rest } = ceiling; setCeiling(v ? { ...rest, lights: { count: Math.round(v), along: lights?.along ?? (room.left + room.right > room.back + room.front ? 'x' : 'z') } } : rest); }} />
          </label>
          {ceiling.lights && <label className="field"><span>LEDs run</span>
            <select aria-label="LEDs run" value={ceiling.lights.along} onChange={e => setCeiling({ ...ceiling, lights: { ...ceiling.lights!, along: e.target.value as 'x' | 'z' } })}>
              <option value="x">Left to right</option><option value="z">Front to back</option>
            </select></label>}
          <p className="note">The ceiling shows from inside the room; orbit views from above look straight in.</p>
        </>}
      </fieldset>
      <fieldset className="paint-picker"><legend>Size</legend>
        {WALL_IDS.map(id => <label className="field" key={id}><span>{wallFrames(room)[id].label} distance (mm)</span>
          <NumericControl label={`${wallFrames(room)[id].label} distance`} value={room[id]} min={ROOM_LIMITS[id][0]} max={ROOM_LIMITS[id][1]} step={50} defaultValue={ROOM_DEFAULTS[id]} {...gesture} onValue={v => store.act(() => store.setRoom({ [id]: v }))} />
        </label>)}
        <label className="field"><span>Ceiling height (mm)</span>
          <NumericControl label="Room height" value={room.height} min={Math.max(ROOM_LIMITS.height[0], (walls?.wainscot ?? 0) + 1)} max={ROOM_LIMITS.height[1]} step={50} defaultValue={ROOM_DEFAULTS.height} {...gesture} onValue={v => store.act(() => store.setRoom({ height: v }))} />
        </label>
      </fieldset>
      <button type="button" disabled={!changed} onClick={() => edit({ walls: null, floor: null, turf: null, ceiling: null })}>Reset room finishes</button>
      <p className="note">Scenery only: finishes show in the builder and gallery previews, never in 3MF or GLB exports.</p>
    </div>
  </>;
}
