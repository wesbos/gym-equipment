/** WebMCP tools for the rack builder: everything the builder UI does with a click, as tools an in-browser agent can
 * call. Every palette command (src/components/CommandPalette/commands.ts) is exposed as its own tool, so new commands
 * appear automatically; the rest wrap the same store actions the inspectors, sidebar, gallery and menus call.
 * Edits go through the store, so each is one undoable history step exactly like the UI's. */
import type { BuilderStore } from '../state/builder-store.ts';
import type { BuilderView } from '../scenes/builder-scene.ts';
import { COMMANDS, focusParts, type EditorApi } from '../components/CommandPalette/commands.ts';
import { clearHistoryWithUndo, removeSelectionWithUndo, resetRackWithUndo } from '../components/Toast/undo-actions.ts';
import { partMeta } from '../components/Inspector/part-meta.ts';
import { collectWarnings } from '../components/Warnings/warnings-model.ts';
import { addPart, closeGallery, openGallery } from '../components/PartGallery/gallery-state.ts';
import { defaultLogoSource } from '../components/logo-defaults.ts';
import { closePanel, isOutlinerOpen, openPanel, setOutlinerOpen } from '../state/editor-ui.ts';
import { editableFields, sharedFields } from '../state/selection.ts';
import { variantOptions } from '../state/selection-actions.ts';
import { whenBuilt } from '../state/build-status.ts';
import { GYM_SLUGS, loadGym, loadGyms } from '../gyms/gyms.ts';
import { getPartPlacementInfo, removeInstance, replaceStructurePart, resizeAssembly, rotationMode, setPlateStack, unpairAccessory } from '../../rack-generator/assembly.ts';
import { placementMounts, proposalAt, proposalCollision, suggestPlacement } from '../../rack-generator/placement-proposals.ts';
import { addsStructure, structureCandidates } from '../../rack-generator/structure-candidates.ts';
import { swapCandidates } from '../../rack-generator/swap.ts';
import { freeSlots, placeHang } from '../../rack-generator/hang-items.ts';
import { barCradles, barSpecOf, freeCradles, parksInCradles } from '../../rack-generator/barbell-cradles.ts';
import { floorPart, coerceFloorParams, floorOptions } from '../../rack-generator/floor-registry.ts';
import { wallPart } from '../../rack-generator/wall-registry.ts';
import { isHangPart } from '../../rack-generator/hang-registry.ts';
import { rackPart, coerceRackParams } from '../../rack-generator/rack-registry.ts';
import { isSystemPart, SYSTEM_DEFAULTS, SYSTEM_NAMES } from '../../rack-generator/system-types.ts';
import { systemWarnings, withSystem } from '../../rack-generator/systems.ts';
import { ROOM_DEFAULTS, ROOM_LIMITS, WALL_IDS, wallFrames, type WallId } from '../../rack-generator/walls.ts';
import { roomOf } from '../../rack-generator/wall-items.ts';
import { FLOOR_FINISHES, WALL_FINISHES, WALL_PAINTS, type RoomFinishes } from '../../rack-generator/room-finishes.ts';
import { DEFAULT_FRAME_COLOR, PAINT_SWATCHES, type FrameFinish, type HardwareFinish } from '../../rack-generator/appearance.ts';
import { resetAppearanceField } from '../../rack-generator/appearance-reset.ts';
import { RACK_PRESETS, applyPreset } from '../../rack-generator/presets.ts';
import { snapDimensions } from '../../rack-generator/grid.ts';
import { dimensionOptions } from '../../rack-generator/standards.ts';
import { gridProfile } from '../../rack-generator/profiles.ts';
import { resetDimensions, resetPart, partDefaults } from '../../rack-generator/reset.ts';
import { setBarLoad } from '../../rack-generator/bar-loads.ts';
import { PLATE_LINES, plateId, type PlateId } from '../../rack-generator/plates.ts';
import { connectUprights, extendUpright, moveConnection, moveUpright, spanAccessory, type Direction } from '../../rack-generator/graph-edits.ts';
import { isHostedTarget, isUprightTarget } from '../../rack-generator/rack-targets.ts';
import type { LogoSource, ValidatedLogo } from '../../rack-generator/logos/types.ts';
import type { BarLoad, Mount, NumericParams, PartId, ResolvedInstance, RackDoc, Face } from '../../rack-generator/types.ts';
import { tool, type JsonSchema, type WebMcpTool } from './model-context.ts';

/** Page-level hooks beyond the command palette's EditorApi. */
export interface BuilderToolHooks {
  /** The current camera view. */
  currentView(): BuilderView;
  /** A PNG/JPEG data URL of the 3D viewport, or null before the scene exists. */
  capture(maxWidth: number): string | null;
  /** Client-side navigation within the app (e.g. `/?gym=<slug>`). */
  navigate(to: string): void;
  /** Play (true) or stop (false) the build animation; resolves false when it cannot play. */
  buildAnimation(play: boolean): boolean;
}

const round = (n: number) => Math.round(n * 10) / 10;
/** Floor items store [x, -y]; tools speak the frame list_design_parts and the uprights use. */
const FLOOR_FRAME = 'Same frame as list_design_parts positions and the rack uprights: x to the right, y toward the back (front uprights have negative y), origin at the rack centre.';
const toDoc = (p: readonly number[]): [number, number] => [p[0], -p[1]];
const toWorld = (p: readonly number[]): [number, number] => [round(p[0]), round(-p[1])];
const vec = (v: readonly number[]) => v.map(round);
const obj = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const str = (description: string, extra: JsonSchema = {}): JsonSchema => ({ type: 'string', description, ...extra });
const num = (description: string, extra: JsonSchema = {}): JsonSchema => ({ type: 'number', description, ...extra });
const bool = (description: string): JsonSchema => ({ type: 'boolean', description });
const ids = (description = 'Physical part ids from list_design_parts.'): JsonSchema => ({ type: 'array', items: { type: 'string' }, description });
const commandToolName = (id: string) => `editor_${id.replaceAll('-', '_')}`;

/** A stable key for a placement mount, so `list_placement_options` and `add_part`/`move_part` agree. */
export function mountKey(m: Mount): string {
  const t = m as Mount & Record<string, unknown>;
  return [t.kind ?? 'upright', t.uprightId, t.face, t.hole, t.connectionId, t.station, t.side, t.host, t.unit, t.frame].map(v => v ?? '').join('|').replace(/\|+$/, '');
}
function describeMount(m: Mount) {
  const t = m as Mount & Record<string, unknown>;
  return { key: mountKey(m), kind: t.kind ?? 'upright', label: m.label ?? undefined, upright: t.uprightId, face: t.face,
    hole: typeof t.hole === 'number' && (t.kind ?? 'upright') === 'upright' ? t.hole + 1 : undefined,
    connection: t.connectionId, station: typeof t.station === 'number' ? t.station + 1 : undefined, host: t.host };
}

export function builderTools(api: EditorApi, hooks: BuilderToolHooks): WebMcpTool[] {
  const { store } = api;
  const s = () => store.getSnapshot();
  const nameOf = (part: string) => partMeta(part, s().definitions).name;
  /** Run a store action the way the UI does; surface the store's error status as a tool error. */
  const run = <T>(action: () => T): T => {
    const before = s().status;
    const result = action();
    const after = s();
    if (after.error && after.status !== before) throw Error(after.status);
    return result;
  };
  const latest = () => { if (s().timeline.viewing) store.latestHistory(); };
  const instance = (id: string): ResolvedInstance => {
    const found = s().resolved.find(r => r.id === id) ?? s().resolved.find(r => r.ownerId === id);
    if (!found) throw Error(`No part "${id}" in the design. Call list_design_parts for ids.`);
    return found;
  };
  const summary = (r: ResolvedInstance) => {
    const { hidden, locked } = s();
    return { id: r.id, owner: r.ownerId !== r.id ? r.ownerId : undefined, part: r.part, name: nameOf(r.part), kind: kindOf(r),
      position: vec(r.position), ...(r.paired ? { paired: true } : {}), ...(hidden.includes(r.id) ? { hidden: true } : {}), ...(locked.includes(r.id) ? { locked: true } : {}) };
  };
  function kindOf(r: ResolvedInstance): string {
    const doc = s().doc;
    if (isSystemPart(r.part) || doc.systems?.some(x => x.id === r.ownerId)) return 'system';
    if (doc.hangItems?.some(h => h.id === r.id)) return 'hang-item';
    return r.kind;
  }
  const selectOnly = (list: readonly string[]) => {
    if (s().placing || s().structureChoice || s().systemChoice) store.cancelPlacement();
    for (const id of list) instance(id);
    if (list.length === 1) store.select(list[0]); else store.selectMany(list);
  };
  const result = (message: string, extra: Record<string, unknown> = {}) => ({ message, status: s().status, selection: s().selection, canUndo: s().canUndo, ...extra });

  // ── Commands: every palette entry, so the palette and WebMCP never drift apart. ──
  const commandTools = COMMANDS.filter(c => c.id !== 'load-json' && c.id !== 'clear-history' && c.id !== 'build').map(command => tool<Record<string, never>>({
    name: commandToolName(command.id),
    description: `${command.group}: ${command.label}.${command.keywords ? ` (${command.keywords})` : ''} Same as the command palette entry${command.shortcut ? ' and its keyboard shortcut' : ''}.`,
    inputSchema: obj({}),
    execute() {
      if (command.available && !command.available(s(), store)) throw Error(`"${command.label}" is not available right now (e.g. nothing selected, nothing to undo, or a placement is in progress).`);
      run(() => command.run(api));
      return result(`Ran "${command.label}".`);
    },
  }));

  const tools: WebMcpTool[] = [
    ...commandTools,

    // ── Reading the design ──
    tool({
      name: 'get_builder_state',
      description: 'Overview of the rack builder: status line, whether the 3D model is still building, rack dimensions and grid, room size, selection, placement mode in progress, undo/redo and history position, hidden/locked parts, saved-design info, open panels and the camera view. Call this first and after edits.',
      inputSchema: obj({}),
      annotations: { readOnlyHint: true },
      execute() {
        const st = s(), doc = st.doc;
        return {
          status: st.status, error: st.error || undefined, building: st.loading, buildProgress: st.buildProgress ?? undefined, dimensions: st.dimensions,
          rack: { ...doc.rack, profile: doc.profileId, profileLabel: gridProfile(doc.profileId).label,
            uprights: Object.fromEntries(Object.entries(doc.uprights).filter(([id]) => !doc.removed.includes(id)).map(([id, p]) => [id, [p.x, p.y, ...(p.height ? [p.height] : [])]])),
            connections: doc.connections.filter(c => !doc.removed.includes(c.id)).map(c => `${c.id}: ${c.from}→${c.to} ${c.level}`) },
          room: roomOf(doc), partCount: st.resolved.length,
          selection: st.selection.map(id => { const r = st.resolved.find(x => x.id === id); return r ? `${id} (${nameOf(r.part)})` : id; }),
          roomInspectorOpen: st.roomInspector || undefined,
          placement: st.placing || st.structureChoice || st.systemChoice ? {
            part: st.placing?.part ?? st.structureChoice ?? st.systemChoice, moving: st.placing?.movingId ?? undefined,
            structureMode: st.structureChoice ? st.structureMode : undefined, systemParams: st.systemChoice ? st.systemParams : undefined,
            hasProposal: !!st.proposal, proposal: st.proposal?.label, hint: st.placementText, paired: st.paired,
          } : null,
          addMatchingPair: st.paired, boxSelectTool: st.selectionTool,
          history: { position: st.timeline.position, latest: st.timeline.latest, viewingPast: st.timeline.viewing, canUndo: st.canUndo, canRedo: st.canRedo },
          hidden: st.hidden, locked: st.locked,
          savedDesign: { activeId: st.activeId, name: st.configs.find(c => c.id === st.activeId)?.name ?? null, unsavedChanges: st.dirty, draftAvailable: st.draftAvailable },
          view: hooks.currentView(), outlinerOpen: isOutlinerOpen(),
          warnings: collectWarnings(doc, st.resolved).length,
        };
      },
    }),
    tool<{ query?: string; kind?: string }>({
      name: 'list_design_parts',
      description: 'Every physical part in the design with its id (use these ids in other tools), part type, display name, kind (structure, accessory, floor-item, wall-item, hang-item, system), position in mm and hidden/locked/paired flags. Paired accessories list both sides; their shared owner id is "owner".',
      inputSchema: obj({ query: str('Filter by id, part type or name (case-insensitive).'), kind: str('Filter by kind.', { enum: ['structure', 'accessory', 'floor-item', 'wall-item', 'hang-item', 'system'] }) }),
      annotations: { readOnlyHint: true },
      execute({ query, kind }) {
        const q = query?.toLowerCase();
        return s().resolved.map(summary).filter(p => (!kind || p.kind === kind) && (!q || [p.id, p.part, p.name].some(v => v.toLowerCase().includes(q))));
      },
    }),
    tool<{ id: string }>({
      name: 'get_part_details',
      description: 'Everything editable about one part: its document entry, numeric fields (with min/max/step) and option params (with allowed values), variants it can swap to, mount/placement, rotation support, pairing, plates, colour/finish overrides. Use before set_part_params, move_part, set_variant.',
      inputSchema: obj({ id: str('A part id from list_design_parts.') }, ['id']),
      annotations: { readOnlyHint: true },
      execute({ id }) {
        const st = s(), doc = st.doc, r = instance(id), owner = r.ownerId || r.id;
        const accessory = doc.accessories.find(a => a.id === owner);
        const floor = doc.floorItems?.find(i => i.id === r.id), wall = doc.wallItems?.find(i => i.id === r.id), hang = doc.hangItems?.find(h => h.id === r.id);
        const system = doc.systems?.find(x => x.id === owner), structure = doc.structure[owner];
        const details: Record<string, unknown> = { ...summary(r), params: r.params };
        if (accessory) {
          const info = getPartPlacementInfo(accessory.part, doc), rp = rackPart(accessory.part), rot = rotationMode(doc, accessory.id);
          Object.assign(details, {
            entry: accessory,
            mount: isUprightTarget(accessory.target) ? { upright: accessory.target.uprightId, face: accessory.target.face, hole: accessory.target.hole + 1, mountHeightMm: doc.rack.firstHole + accessory.target.hole * doc.rack.pitch } : accessory.target,
            pairable: !!info?.paired, faces: info?.faces,
            numericFields: editableFields(accessory.part, doc),
            optionParams: rp?.params.map(p => ({ key: p.key, label: p.label, value: { ...rp.defaults, ...accessory.params }[p.key], default: p.default, options: floorOptions(p, { ...rp.defaults, ...accessory.params }) })),
            defaults: partDefaults(doc, accessory.part),
            rotation: { supported: rot.supported, label: rot.label, reason: rot.reason, current: accessory.rotation ?? 0 },
            holdsPlates: !!accessory.plates || undefined, plates: accessory.plates,
          });
        } else if (floor) {
          const part = floorPart(floor.part)!;
          Object.assign(details, { entry: floor, floorPosition: toWorld(floor.position), rotationDeg: round(floor.rotation * 180 / Math.PI),
            cradle: floor.cradle ? barCradles(st.resolved, barSpecOf(floor)).find(c => c.key === floor.cradle)?.label ?? floor.cradle : undefined,
            parksInCradles: !!part.parks || undefined, loadsPlates: !!part.bar || undefined, plates: floor.plates,
            optionParams: part.params.map(p => ({ key: p.key, label: p.label, value: floor.params[p.key], default: p.default, options: floorOptions(p, floor.params) })),
            colors: part.colors });
        } else if (wall) {
          const part = wallPart(wall.part)!, frame = wallFrames(roomOf(doc))[wall.wall];
          Object.assign(details, { entry: wall, wall: wall.wall, alongMm: wall.position[0], heightMm: wall.position[1], wallLengthMm: frame.length,
            optionParams: part.params.map(p => ({ key: p.key, label: p.label, value: wall.params[p.key], default: p.default, options: floorOptions(p, wall.params) })) });
        } else if (hang) {
          Object.assign(details, { entry: hang, freeHooks: freeSlots(doc, hang.part, hang.id) });
        } else if (system) {
          Object.assign(details, { entry: system, systemName: SYSTEM_NAMES[system.part], defaults: SYSTEM_DEFAULTS[system.part], warnings: systemWarnings(doc) });
        } else if (structure || doc.uprights[owner] || doc.connections.some(c => c.id === owner)) {
          Object.assign(details, { structure: structure ?? null, upright: doc.uprights[owner], connection: doc.connections.find(c => c.id === owner),
            numericFields: editableFields(r.part, doc), defaults: partDefaults(doc, r.part) });
        }
        details.variants = variantOptions(doc, st.resolved, r.id).map(v => ({ id: v, name: nameOf(v) }));
        const appearance = doc.appearance;
        if (appearance?.overrides?.[r.id] || appearance?.finishOverrides?.[r.id]) details.appearance = { color: appearance.overrides?.[r.id], finish: appearance.finishOverrides?.[r.id] };
        return details;
      },
    }),
    tool<{ query?: string; category?: string; limit?: number }>({
      name: 'search_parts_catalog',
      description: 'Search the catalog of parts that can be added (rack attachments, frame members, cable systems, floor equipment, wall panels, hanging attachments). Returns part ids for add_part / list_placement_options.',
      inputSchema: obj({ query: str('Words to match in the id, name or category (all must match).'), category: str('Exact or partial category name.'), limit: num('Maximum results (default 40).') }),
      annotations: { readOnlyHint: true },
      execute({ query, category, limit = 40 }) {
        const defs = s().definitions;
        if (!defs.length) throw Error('The catalog is still loading. Try again in a moment.');
        const words = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean), c = category?.toLowerCase();
        const matches = defs.filter(d => (!c || d.category.toLowerCase().includes(c)) && words.every(w => `${d.id} ${d.name} ${d.category}`.toLowerCase().includes(w)));
        return { total: matches.length, categories: c || words.length ? undefined : [...new Set(defs.map(d => d.category))],
          parts: matches.slice(0, limit).map(d => ({ id: d.id, name: nameOf(d.id), category: d.category, ...(isSystemPart(d.id) ? { type: 'system' } : floorPart(d.id) ? { type: 'floor' } : wallPart(d.id) ? { type: 'wall' } : isHangPart(d.id) ? { type: 'hang' } : addsStructure(d.id as PartId) ? { type: 'structure' } : {}) })) };
      },
    }),
    tool({
      name: 'list_warnings',
      description: 'Collisions, overlaps and fit warnings for the current design (the Warnings button), with the part ids involved.',
      inputSchema: obj({}),
      annotations: { readOnlyHint: true },
      execute: () => [...collectWarnings(s().doc, s().resolved), ...systemWarnings(s().doc).map(message => ({ ids: [], message }))],
    }),
    tool({
      name: 'get_design_document',
      description: 'The full design document (RackDoc JSON): rack, uprights, connections, structure, accessories, floor/wall/hang items, systems, room, appearance and logo. Edit it and pass it to replace_design_document for anything no other tool covers.',
      inputSchema: obj({}),
      annotations: { readOnlyHint: true },
      execute: () => store.getAppliedDoc(),
    }),
    tool<{ document: RackDoc | string; label?: string }>({
      name: 'replace_design_document',
      description: 'Replace the design with an edited RackDoc (from get_design_document). Validated like a loaded file; one undoable history step. Use for edits that have no dedicated tool.',
      inputSchema: obj({ document: { type: ['object', 'string'], description: 'The full RackDoc object (or its JSON text).' }, label: str('History label, e.g. "Move bench".') }, ['document']),
      annotations: { destructiveHint: true },
      execute({ document, label }) {
        const doc = typeof document === 'string' ? JSON.parse(document) : document;
        latest();
        store.endGesture();
        store.commit(doc, label ? { label } : {});
        return result('Design document replaced.', { parts: s().resolved.length });
      },
    }),
    tool<{ max_width?: number; wait_for_build?: boolean }>({
      name: 'capture_viewport',
      description: 'Screenshot of the 3D view (what the person sees), as an image. Waits for the model to finish building first by default.',
      inputSchema: obj({ max_width: num('Image width cap in px (default 1024).'), wait_for_build: bool('Wait for the CAD rebuild to finish first (default true).') }),
      annotations: { readOnlyHint: true },
      async execute({ max_width = 1024, wait_for_build = true }) {
        if (wait_for_build) await whenBuilt(store, 30000).catch(() => {});
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const url = hooks.capture(max_width);
        if (!url) throw Error('The 3D view is not ready.');
        const [meta, data] = url.split(',');
        return { content: [{ type: 'image', data, mimeType: meta.slice(5, meta.indexOf(';')) }, { type: 'text', text: `${s().dimensions} · ${s().status}` }] };
      },
    }),
    tool<{ timeout_ms?: number }>({
      name: 'wait_for_build',
      description: 'Wait until the 3D model has finished rebuilding after edits (parts are generated in a worker).',
      inputSchema: obj({ timeout_ms: num('Give up after this many ms (default 30000).') }),
      annotations: { readOnlyHint: true },
      async execute({ timeout_ms = 30000 }) {
        await whenBuilt(store, timeout_ms);
        return { status: s().status, parts: s().resolved.length, error: s().error || undefined };
      },
    }),

    // ── Selection, visibility, camera ──
    tool<{ ids: string[]; mode?: 'replace' | 'add' | 'toggle'; frame?: boolean }>({
      name: 'select_parts',
      description: 'Select parts (as clicking, Shift-click or ⌘-click in the 3D view or outliner does). Opens their inspector. An empty list clears the selection.',
      inputSchema: obj({ ids: ids(), mode: str('replace (default), add to, or toggle in the selection.', { enum: ['replace', 'add', 'toggle'] }), frame: bool('Also fly the camera to them.') }, ['ids']),
      execute({ ids: list, mode = 'replace', frame }) {
        for (const id of list) instance(id);
        if (!list.length) store.select(null);
        else if (mode === 'replace') { if (frame) focusParts(api, list); else selectOnly(list); }
        else if (mode === 'add') store.selectMany(list, true);
        else for (const id of list) store.select(id, { metaKey: true });
        if (frame && mode !== 'replace') api.scene()?.focus(list);
        return result(`Selected ${s().selection.length} part(s).`);
      },
    }),
    tool<{ ids?: string[] }>({
      name: 'frame_parts',
      description: 'Point the camera at these parts (or fit the whole gym when none are given) without changing the selection.',
      inputSchema: obj({ ids: ids() }),
      execute({ ids: list }) { if (list?.length) { list.forEach(instance); api.scene()?.focus(list); } else api.scene()?.fit(); return 'Camera moved.'; },
    }),
    tool<{ view: BuilderView }>({
      name: 'set_camera_view',
      description: 'Switch the camera to the 3D (isometric), front, side or top view and fit the gym.',
      inputSchema: obj({ view: str('Camera view.', { enum: ['iso', 'front', 'side', 'top'] }) }, ['view']),
      execute({ view }) { api.view(view); return `View: ${view}.`; },
    }),
    tool<{ ids: string[]; hidden: boolean }>({
      name: 'set_parts_hidden',
      description: 'Hide or show parts (outliner eye). Hidden parts are not drawn and cannot be picked.',
      inputSchema: obj({ ids: ids(), hidden: bool('true hides, false shows.') }, ['ids', 'hidden']),
      execute({ ids: list, hidden }) { list.forEach(instance); store.setHidden(list, hidden); return result(`${hidden ? 'Hid' : 'Showed'} ${list.length} part(s).`, { hidden: s().hidden }); },
    }),
    tool<{ ids: string[]; locked: boolean }>({
      name: 'set_parts_locked',
      description: 'Lock or unlock parts (outliner lock). Locked parts can be selected but not moved, picked up or rotated.',
      inputSchema: obj({ ids: ids(), locked: bool('true locks, false unlocks.') }, ['ids', 'locked']),
      execute({ ids: list, locked }) { list.forEach(instance); store.setLocked(list, locked); return result(`${locked ? 'Locked' : 'Unlocked'} ${list.length} part(s).`, { locked: s().locked }); },
    }),
    tool<{ panel: 'outliner' | 'shortcuts' | 'palette' | 'gallery' | 'room'; open: boolean; query?: string }>({
      name: 'set_panel_open',
      description: 'Open or close a builder panel: the outliner (parts tree), keyboard shortcuts overlay, command palette, parts gallery (optionally searching), or the room inspector.',
      inputSchema: obj({ panel: str('Which panel.', { enum: ['outliner', 'shortcuts', 'palette', 'gallery', 'room'] }), open: bool('Open (true) or close (false).'), query: str('Gallery search text when opening it.') }, ['panel', 'open']),
      execute({ panel, open, query }) {
        if (panel === 'outliner') setOutlinerOpen(open);
        else if (panel === 'gallery') { if (open) openGallery(query ? { query } : {}); else closeGallery(); }
        else if (panel === 'room') { if (open) store.openRoom(); else if (s().roomInspector) store.select(null); }
        else if (open) openPanel(panel); else closePanel();
        return `${panel} ${open ? 'opened' : 'closed'}.`;
      },
    }),

    // ── Adding and moving parts ──
    tool<{ part: string; moving_id?: string }>({
      name: 'list_placement_options',
      description: 'Where a part can go, before add_part or move_part: mounts on the rack (keys, with upright/face/hole or crossmember stations), structure slots for uprights/crossmembers/frame members, free bar cradles, walls and their sizes, free hooks on wall panels, or a cable/Smith system\'s install params. Includes the builder\'s suggested spot.',
      inputSchema: obj({ part: str('A catalog part id (search_parts_catalog).'), moving_id: str('When moving an existing part, its id (frees its own spot).') }, ['part']),
      annotations: { readOnlyHint: true },
      execute({ part, moving_id }) {
        const st = s(), doc = st.doc, p = part as PartId, owner = moving_id ? instance(moving_id).ownerId : null;
        knownPart(part);
        if (isSystemPart(part)) return { type: 'system', name: SYSTEM_NAMES[part], params: SYSTEM_DEFAULTS[part], note: 'Pass system_params to add_part to change install options (see the defaults for keys).' };
        if (floorPart(part)) {
          const spec = floorPart(part)!;
          return { type: 'floor', pairable: !!spec.pair, note: `Pass floor_position [x, y] in mm and rotation_deg. ${FLOOR_FRAME} Omit for the suggested spot beside the rack.`,
            cradles: spec.parks ? freeCradles(st.resolved, doc.floorItems, owner).map(c => ({ key: c.key, label: c.label, kind: c.kind })) : undefined,
            existingFloorItems: (doc.floorItems ?? []).map(i => ({ id: i.id, part: i.part, position: toWorld(i.position), rotationDeg: round(i.rotation * 180 / Math.PI) })) };
        }
        if (wallPart(part)) {
          const room = roomOf(doc), frames = wallFrames(room);
          return { type: 'wall', walls: WALL_IDS.map(w => ({ wall: w, label: frames[w].label, lengthMm: frames[w].length, heightMm: room.height })), defaultHeightMm: wallPart(part)!.height ?? 1500,
            note: 'Pass wall and wall_position [along mm from the wall centre, centre height mm].' };
        }
        if (isHangPart(part)) return { type: 'hang', hooks: freeSlots(doc, part, owner), note: doc.wallItems?.length ? 'Pass hook {panel, slot}.' : 'Add a wall panel first.' };
        if (addsStructure(p)) return { type: 'structure',
          add: structureCandidates(doc, p).map(c => ({ key: c.key, label: c.label })),
          swap: swapCandidates(doc, p).filter(c => c.valid).map(c => ({ slot: c.ownerId, replaces: st.resolved.some(r => r.ownerId === c.ownerId) })),
          note: 'Pass structure_key to add new structure, or swap_slot to put this member in an existing slot.' };
        const info = getPartPlacementInfo(p, doc);
        if (!info) throw Error(`Unknown part "${part}".`);
        if (info.slots?.length) return { type: 'frame-member', swap: swapCandidates(doc, p).filter(c => c.valid).map(c => ({ slot: c.ownerId, replaces: st.resolved.some(r => r.ownerId === c.ownerId) })), note: 'Pass swap_slot.' };
        const mounts = placementMounts(doc, p, owner);
        const paired = owner ? doc.accessories.find(a => a.id === owner)?.paired ?? false : st.paired && !!info.paired;
        const suggested = suggestPlacement(doc, p, paired, owner).proposal?.target;
        return { type: 'rack-attachment', pairable: !!info.paired, suggested: suggested ? mountKey(suggested) : null, count: mounts.length,
          mounts: mounts.slice(0, 250).map(describeMount), note: 'Pass mount_key to add_part / move_part. Hole numbers are 1-based.' };
      },
    }),
    tool<AddArgs>({
      name: 'add_part',
      description: 'Add a catalog part to the design, as picking it in the sidebar or gallery and clicking a spot does. Without a target the builder\'s suggested spot is used. Use list_placement_options for targets. With accept=false the part stays as a ghost in placement mode for the person to adjust, then accept_placement places it.',
      inputSchema: obj({
        part: str('Catalog part id.'),
        paired: bool('Add a matching pair (both sides). Defaults to the part\'s own default.'),
        mount_key: str('Rack mount key from list_placement_options.'),
        structure_key: str('Uprights/crossmembers: add-candidate key from list_placement_options.'),
        swap_slot: str('Frame members: the slot to fill or replace.'),
        floor_position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: `Floor items: [x, y] mm. ${FLOOR_FRAME}` },
        rotation_deg: num('Floor items: heading in degrees.'),
        cradle_key: str('Barbells: a free cradle key to park in.'),
        wall: str('Wall items: which wall.', { enum: [...WALL_IDS] }),
        wall_position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: 'Wall items: [along mm from wall centre, height mm].' },
        hook: obj({ panel: str('Wall panel id.'), slot: num('Hook index.') }),
        system_params: { type: 'object', description: 'Cable/Smith systems: install params (see list_placement_options).' },
        accept: bool('Place it now (default true). false leaves it staged as a ghost.'),
      }, ['part']),
      execute(args) { return stage(args, null); },
    }),
    tool<AddArgs & { id: string; upright?: string; face?: Face; hole?: number; along_mm?: number; height_mm?: number }>({
      name: 'move_part',
      description: 'Move a placed part: rack attachments to another mount (mount_key, or upright/face/hole), floor items to a position/heading or a bar cradle, wall items along/between walls, hanging attachments to another hook, uprights to new x/y. One undo step. Locked parts refuse.',
      inputSchema: obj({
        id: str('The part id.'),
        mount_key: str('Rack attachments: mount key from list_placement_options (with moving_id).'),
        upright: str('Rack attachments on uprights: upright id.'), face: str('Mounting face.', { enum: ['front', 'back', 'left', 'right'] }), hole: num('1-based hole number.'),
        paired: bool('Rack attachments: keep/make a matching pair.'),
        floor_position: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: `Floor items / uprights: [x, y] mm. ${FLOOR_FRAME}` },
        rotation_deg: num('Floor items: heading in degrees.'),
        cradle_key: str('Barbells: park in this free cradle; "floor" sets it on the floor.'),
        wall: str('Wall items: wall.', { enum: [...WALL_IDS] }), along_mm: num('Wall items: mm from the wall centre.'), height_mm: num('Wall items: centre height mm.'),
        hook: obj({ panel: str('Wall panel id.'), slot: num('Hook index.') }),
      }, ['id']),
      execute(args) { return move(args); },
    }),
    tool({
      name: 'accept_placement',
      description: 'Place the part currently staged in placement mode at its shown (ghost) position: the Place / Apply rotation button.',
      inputSchema: obj({}),
      execute() {
        if (!s().proposal) throw Error(s().placementText || 'Nothing is being placed.');
        run(store.acceptProposal);
        return result('Placed.');
      },
    }),
    tool({
      name: 'cancel_placement',
      description: 'Cancel the placement in progress (Esc).',
      inputSchema: obj({}),
      execute() { store.cancelPlacement(); return result('Placement cancelled.'); },
    }),
    tool<{ part: string; mode?: 'default' | 'single' | 'pair' }>({
      name: 'start_placement',
      description: 'Enter interactive placement mode for a catalog part (like clicking its card) so the person can click where it goes; the ghost shows the suggested spot. Use add_part to place it directly instead.',
      inputSchema: obj({ part: str('Catalog part id.'), mode: str('Pairing.', { enum: ['default', 'single', 'pair'] }) }, ['part']),
      execute({ part, mode = 'default' }) { latest(); run(() => addPart(store, part as PartId, mode)); return result(s().placementText || `Placing ${nameOf(part)}.`); },
    }),
    tool<{ ids?: string[] }>({
      name: 'delete_parts',
      description: 'Remove parts (the selection when no ids are given). Removing a wall panel removes what hangs on it. Shows an undo toast; editor_undo restores.',
      inputSchema: obj({ ids: ids() }),
      annotations: { destructiveHint: true },
      execute({ ids: list }) {
        if (list?.length) selectOnly(list);
        if (!s().selection.length) throw Error('Nothing selected to delete.');
        const count = s().selection.length;
        run(() => removeSelectionWithUndo(store));
        return result(`Deleted ${count} part(s).`);
      },
    }),
    tool<{ ids?: string[] }>({
      name: 'duplicate_parts',
      description: 'Duplicate parts (the selection when no ids are given); the copies become the selection.',
      inputSchema: obj({ ids: ids() }),
      execute({ ids: list }) {
        if (list?.length) selectOnly(list);
        const before = new Set(s().resolved.map(r => r.id));
        if (!run(() => store.duplicateSelected())) throw Error('These parts cannot be duplicated.');
        return result('Duplicated.', { added: s().resolved.filter(r => !before.has(r.id)).map(r => r.id) });
      },
    }),
    tool<{ id?: string; direction?: 1 | -1; steps?: number }>({
      name: 'rotate_part',
      description: 'Rotate a part one step (R / Shift+R): floor items by 15°, rotatable rack attachments by their own step (applied immediately). Uses the selection when no id is given.',
      inputSchema: obj({ id: str('Part id.'), direction: num('1 clockwise (default), -1 the other way.', { enum: [1, -1] }), steps: num('How many steps (default 1).') }),
      execute({ id, direction = 1, steps = 1 }) {
        if (id) selectOnly([id]);
        const subject = store.rotationSubject();
        if (!subject) throw Error('This part does not rotate.');
        for (let i = 0; i < steps; i++) if (!run(() => store.rotateSelection(direction))) throw Error('Rotation refused.');
        if (s().placing?.rotationOnly && s().proposal) run(store.acceptProposal);
        return result(`Rotated ${steps} step(s).`);
      },
    }),

    // ── Editing parts ──
    tool<{ id?: string; ids?: string[]; params: NumericParams }>({
      name: 'set_part_params',
      description: 'Change a part\'s parameters (sizes in mm, option selects, vendor options, system install options), as its inspector fields do. Keys and limits come from get_part_details (numericFields, optionParams, defaults). Option values snap to the nearest allowed option. With ids, sets shared numeric fields on several rack attachments (multi-select inspector). Returns the resulting params.',
      inputSchema: obj({ id: str('Part id.'), ids: ids('Several rack attachments (shared numeric fields only).'), params: { type: 'object', additionalProperties: { type: 'number' }, description: 'key → number.' } }, ['params']),
      execute({ id, ids: list, params }) {
        latest();
        if (list && list.length > 1) {
          selectOnly(list);
          for (const [key, value] of Object.entries(params)) {
            const field = sharedFields(s().doc, s().resolved.filter(r => s().selection.includes(r.id))).find(f => f.key === key);
            if (!field) throw Error(`"${key}" is not a shared numeric field of these parts.`);
            if (value < field.min || value > field.max) throw Error(`${field.label} must be between ${field.min} and ${field.max}.`);
            run(() => store.editSelectionParam(key, value));
          }
          return result('Shared parameters set.');
        }
        const target = id ?? list?.[0] ?? s().selected;
        if (!target) throw Error('Pass a part id.');
        return setParams(target, params);
      },
    }),
    tool<{ id: string; keys?: string[] }>({
      name: 'reset_part',
      description: 'Reset a part to its defaults (the inspector\'s "Reset this part"), or only the given parameter keys.',
      inputSchema: obj({ id: str('Part id.'), keys: { type: 'array', items: { type: 'string' }, description: 'Only these params.' } }, ['id']),
      execute({ id, keys }) {
        const r = instance(id), doc = s().doc;
        const floor = doc.floorItems?.find(i => i.id === r.id), wall = doc.wallItems?.find(i => i.id === r.id);
        if (floor || wall) {
          const part = (floor ? floorPart(floor.part) : wallPart(wall!.part))!;
          const params = keys?.length ? { ...(floor ?? wall)!.params, ...Object.fromEntries(keys.map(k => [k, part.defaults[k]])) } : { ...part.defaults };
          run(() => floor ? store.updateFloor(r.id, { params, ...(keys?.length ? {} : { rotation: 0 }) }) : store.updateWall(r.id, { params }));
        } else {
          store.endGesture();
          run(() => store.edit(current => (keys?.length ? keys : [undefined]).reduce((d, key) => resetPart(d, key === undefined ? r.id : r.ownerId || r.id, key), current)));
        }
        return result('Reset.', { params: instance(id).params });
      },
    }),
    tool<{ id: string; variant: string }>({
      name: 'set_variant',
      description: 'Swap a part to another variant of its family, or another frame member for its slot (the Variant / Frame member select). Options are get_part_details.variants.',
      inputSchema: obj({ id: str('Part id.'), variant: str('Part id of the variant.') }, ['id', 'variant']),
      execute({ id, variant }) {
        const options = variantOptions(s().doc, s().resolved, instance(id).id);
        if (!options.includes(variant as PartId)) throw Error(`Variants for ${id}: ${options.join(', ')}`);
        selectOnly([instance(id).id]);
        run(() => store.swapSelectedVariant(variant as PartId));
        return result(`Now ${nameOf(variant)}.`);
      },
    }),
    tool<{ id: string; paired: boolean }>({
      name: 'set_part_paired',
      description: 'Pair a pairable rack attachment with a matching mirror on the other upright, or split a pair so each side edits independently ("Edit sides independently").',
      inputSchema: obj({ id: str('Part id.'), paired: bool('true pairs, false splits.') }, ['id', 'paired']),
      execute({ id, paired }) {
        const r = instance(id), entry = s().doc.accessories.find(a => a.id === r.ownerId);
        if (!entry) throw Error('Only rack attachments pair.');
        if (entry.paired === paired) return result(`Already ${paired ? 'paired' : 'unpaired'}.`);
        if (!paired) run(() => store.commit(unpairAccessory(s().doc, entry.id)));
        else { selectOnly([r.id]); run(store.togglePairSelected); }
        return result(paired ? 'Paired.' : 'Split into independent sides.');
      },
    }),
    tool<{ id: string; plates?: string[]; right?: string[]; left?: string[] }>({
      name: 'set_plates',
      description: 'Load plates on a barbell (both sleeves alike with plates, or right/left separately) or a weight storage pin (plates, root outward). An empty list unloads. Plate ids come from list_plates.',
      inputSchema: obj({ id: str('Bar or storage pin id.'), plates: { type: 'array', items: { type: 'string' }, description: 'Plate ids, inner collar outward (both sleeves).' },
        right: { type: 'array', items: { type: 'string' } }, left: { type: 'array', items: { type: 'string' } } }, ['id']),
      execute({ id, plates, right, left }) {
        const r = instance(id), doc = s().doc;
        if (doc.floorItems?.some(i => i.id === r.id)) {
          const load: BarLoad | undefined = right || left ? { right: (right ?? []) as PlateId[], left: (left ?? []) as PlateId[] } : plates?.length ? { both: plates as PlateId[] } : undefined;
          run(() => store.commit(setBarLoad(doc, r.id, load), { category: 'edit', label: 'Load plates' }));
        } else run(() => store.commit(setPlateStack(doc, r.ownerId || r.id, (plates ?? []) as PlateId[]), { category: 'edit', label: 'Load plates' }));
        return result('Plates set.');
      },
    }),
    tool<{ query?: string }>({
      name: 'list_plates',
      description: 'Plate lines and their plate ids for set_plates (e.g. "kg20", "rogue-echo-v2:45", "wio-machined:25@red").',
      inputSchema: obj({ query: str('Filter by brand or name.') }),
      annotations: { readOnlyHint: true },
      execute({ query }) {
        const q = query?.toLowerCase();
        return PLATE_LINES.filter(l => !q || `${l.id} ${l.brand} ${l.name} ${l.group}`.toLowerCase().includes(q)).map(l => ({
          line: l.id, name: `${l.brand} ${l.name}`, group: l.group, unit: l.unit,
          plates: l.weights.map(w => plateId(l.id, w.key)), finishes: l.finishes?.map(f => f.id) }));
      },
    }),

    // ── Appearance ──
    tool<{ ids?: string[]; color?: string; finish?: FrameFinish; hardware_finish?: HardwareFinish | 'original'; reset?: boolean }>({
      name: 'set_appearance',
      description: `Paint and finish. Without ids it sets the whole rack (frame colour, steel finish, fastener finish). With ids it overrides just those pieces; reset=true returns them to the rack appearance (or resets the rack to the default ${DEFAULT_FRAME_COLOR} powder coat). Swatches: ${PAINT_SWATCHES.map(([n, h]) => `${n} ${h}`).join(', ')}.`,
      inputSchema: obj({
        ids: ids('Pieces to override; omit for the whole rack.'),
        color: str('Hex colour like #283e32 (implies powder-coat finish).'),
        finish: str('Steel finish.', { enum: ['paint', 'stainless', 'clear-grind'] }),
        hardware_finish: str('Rack-wide fastener finish.', { enum: ['original', 'chrome', 'gold', 'oxide'] }),
        reset: bool('Reset to defaults instead.'),
      }),
      execute({ ids: list, color, finish, hardware_finish, reset }) {
        if (color && !/^#[0-9a-f]{6}$/i.test(color)) throw Error('Colours are #rrggbb hex.');
        latest();
        if (list?.length) {
          selectOnly(list);
          if (reset) run(store.resetSelectionAppearance);
          if (color) run(() => store.paintSelection(color));
          if (finish) run(() => store.finishSelection(finish));
          return result('Piece appearance updated.');
        }
        run(() => store.edit(current => {
          let appearance = { ...current.appearance };
          if (reset) appearance = { ...resetAppearanceField(resetAppearanceField(appearance, 'color'), 'finish'), frameColor: DEFAULT_FRAME_COLOR, frameFinish: 'paint' };
          if (color) Object.assign(appearance, { frameColor: color, frameFinish: 'paint' });
          if (finish) appearance.frameFinish = finish;
          if (hardware_finish) appearance.hardwareFinish = hardware_finish === 'original' ? undefined : hardware_finish;
          return { ...current, appearance };
        }));
        return result('Rack appearance updated.', { appearance: s().doc.appearance });
      },
    }),
    tool<{ text?: string; font?: 'helvetiker' | 'helvetikerRegular'; svg?: string; bridges?: boolean; reset?: boolean }>({
      name: 'set_logo',
      description: 'Custom logo on nameplates and branded crossmembers: text (up to 32 characters) or SVG markup, validated and cut like "Validate & preview logo" then "Apply logo to rack". reset=true restores the stock BOS lettering.',
      inputSchema: obj({ text: str('Logo text.'), font: str('Font.', { enum: ['helvetiker', 'helvetikerRegular'] }), svg: str('SVG markup (≤ 250 KB).'), bridges: bool('Automatic island bridges (default true).'), reset: bool('Restore the stock lettering.') }),
      async execute({ text, font, svg, bridges = true, reset }) {
        if (reset) { const next = { ...s().doc }; delete next.logo; run(() => store.commit(next)); return result('Stock logo restored.'); }
        const source: LogoSource = svg ? { kind: 'svg', data: svg } : { ...(defaultLogoSource('text') as Extract<LogoSource, { kind: 'text' }>), ...(text !== undefined ? { text } : {}), ...(font ? { font } : {}) };
        const logo = await validateLogoInWorker(source, bridges);
        run(() => store.commit({ ...s().doc, logo }));
        return result('Logo applied.', { contours: logo.loops.length, minimumFeatureMm: logo.minimum, warnings: logo.warnings });
      },
    }),

    // ── Room ──
    tool<{ back?: number; left?: number; right?: number; front?: number; height?: number }>({
      name: 'set_room_size',
      description: `Move the walls: distance in mm from the rack to each wall, and ceiling height. Limits: ${Object.entries(ROOM_LIMITS).map(([k, [a, b]]) => `${k} ${a}–${b}`).join(', ')}. Defaults: ${JSON.stringify(ROOM_DEFAULTS)}.`,
      inputSchema: obj({ back: num('Back wall distance.'), left: num('Left wall distance.'), right: num('Right wall distance.'), front: num('Front wall distance.'), height: num('Ceiling height.') }),
      execute(patch) {
        for (const [key, value] of Object.entries(patch)) { const [a, b] = ROOM_LIMITS[key as keyof typeof ROOM_LIMITS]; if (value < a || value > b) throw Error(`${key} must be ${a}–${b} mm.`); }
        run(() => store.setRoom(patch));
        return result('Room resized.', { room: roomOf(s().doc) });
      },
    }),
    tool<{ walls?: RoomFinishes['walls'] | null; floor?: RoomFinishes['floor'] | null; turf?: RoomFinishes['turf'] | null; ceiling?: RoomFinishes['ceiling'] | null }>({
      name: 'set_room_finishes',
      description: `Room look (the Room inspector). walls: { finish: ${WALL_FINISHES.join('|')}, color?: hex, wainscot?: mm, overrides?: { back|left|right|front: same shape } }. floor: ${FLOOR_FINISHES.join('|')}. turf: up to 8 lanes [{ position: [x,y], size: [w,l], lines?: bool, text?: "UPPERCASE", textRotation?: 0|90|180|270 }]. ceiling: { color?: hex, lights?: { count: 1–12, along: "x"|"z" } }. null resets that part to default. Wall paints: ${WALL_PAINTS.map(([n, h]) => `${n} ${h}`).join(', ')}.`,
      inputSchema: obj({ walls: { type: ['object', 'null'] }, floor: { type: ['string', 'null'], enum: [...FLOOR_FINISHES, null] }, turf: { type: ['array', 'null'] }, ceiling: { type: ['object', 'null'] } }),
      execute(patch) { run(() => store.setRoomFinish(patch)); return result('Room finishes updated.', { room: roomOf(s().doc) }); },
    }),

    // ── Rack frame ──
    tool<{ height?: number; width?: number; depth?: number; reset?: boolean }>({
      name: 'set_rack_dimensions',
      description: 'Rack settings → Frame: upright height (1000–4000), clear width (400–2000) and clear depth (300–1500) in mm. Values snap to the rack\'s hole grid and its profile\'s standard depths. reset=true restores the default dimensions.',
      inputSchema: obj({ height: num('Upright height mm.'), width: num('Clear width mm.'), depth: num('Clear depth mm.'), reset: bool('Reset dimensions.') }),
      execute({ reset, ...patch }) {
        latest();
        store.endGesture();
        if (reset) { run(() => store.edit(current => resetDimensions(current))); return result('Dimensions reset.', { rack: s().doc.rack }); }
        const doc = s().doc, snapped = snapDimensions(doc.rack, patch, doc.profileId);
        const target = Object.fromEntries(Object.keys(patch).map(k => [k, snapped[k as keyof typeof snapped]]));
        run(() => store.commit(resizeAssembly(doc, target)));
        const moved = Object.keys(patch).filter(k => target[k] !== patch[k as keyof typeof patch]);
        const options = moved.length ? Object.fromEntries(moved.map(k => [k, dimensionOptions(doc.rack, k as 'height' | 'width' | 'depth', doc.profileId).map(o => o.value)])) : undefined;
        return result(moved.length ? `Rack resized; ${moved.join(', ')} snapped to the rack's grid.` : 'Rack resized.', { requested: patch, snapped: target, ...(options ? { standardSizes: options } : {}), rack: s().doc.rack });
      },
    }),
    tool<{ query?: string; featured_only?: boolean; limit?: number }>({
      name: 'list_rack_presets',
      description: 'Rack starters (4-post, 6-post, half racks from BOS, REP and other makers) for apply_rack_preset.',
      inputSchema: obj({ query: str('Filter by words in the label, vendor or id.'), featured_only: bool('Only the featured starters.'), limit: num('Maximum results (default 60).') }),
      annotations: { readOnlyHint: true },
      execute({ query, featured_only, limit = 60 }) {
        const words = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
        const list = RACK_PRESETS.filter(p => (!featured_only || p.featured) && words.every(w => `${p.id} ${p.label} ${p.vendor ?? ''}`.toLowerCase().includes(w)));
        return { total: list.length, presets: list.slice(0, limit).map(p => ({ id: p.id, label: p.label, vendor: p.vendor, kind: p.kind, featured: p.featured || undefined })) };
      },
    }),
    tool<{ id: string }>({
      name: 'apply_rack_preset',
      description: 'Replace the rack with a starter preset (the sidebar\'s rack starters). One undoable step.',
      inputSchema: obj({ id: str('Preset id from list_rack_presets.') }, ['id']),
      annotations: { destructiveHint: true },
      execute({ id }) {
        const preset = RACK_PRESETS.find(p => p.id === id);
        if (!preset) throw Error(`No preset "${id}".`);
        latest();
        run(() => { store.endGesture(); store.commit(applyPreset(id), { category: 'preset', label: preset.label, replacement: true }); });
        api.scene()?.refitOnNextBuild();
        return result(`Applied ${preset.label}.`);
      },
    }),
    tool<TopologyArgs>({
      name: 'edit_rack_topology',
      description: 'Uprights & connections editor: add an upright beside another (direction + clear span), connect two uprights with an upper/lower crossmember or a spanning part (pull-up bar, safeties), move an upright, move or remove a connection, remove an upright.',
      inputSchema: obj({
        action: str('Edit.', { enum: ['add_upright', 'connect', 'move_upright', 'move_connection', 'remove'] }),
        from: str('add_upright/connect/move_connection: start upright id.'), to: str('connect/move_connection: end upright id.'),
        direction: str('add_upright: side.', { enum: ['left', 'right', 'rear', 'front'] }), span: num(`add_upright: clear span mm (profile depths).`),
        connection: str('connect: upper, lower, or a spanning part id (pullup-straight, safety-box, safety-pin-pipe, safety-webbing).'), hole: num('connect with a spanning part: 1-based hole.'),
        id: str('move_upright/move_connection/remove: upright or connection id.'), x: num('move_upright: x mm.'), y: num('move_upright: depth mm.'),
        level: str('move_connection: level.', { enum: ['upper', 'lower'] }),
      }, ['action']),
      execute(args) {
        const doc = s().doc;
        const next = (() => {
          switch (args.action) {
            case 'add_upright': return extendUpright(doc, need(args.from, 'from'), need(args.direction, 'direction') as Direction, args.span ?? gridProfile(doc.profileId).depths[0]);
            case 'connect': { const kind = need(args.connection, 'connection'); return kind === 'upper' || kind === 'lower' ? connectUprights(doc, need(args.from, 'from'), need(args.to, 'to'), kind) : spanAccessory(doc, need(args.from, 'from'), need(args.to, 'to'), kind as PartId, (args.hole ?? 25) - 1); }
            case 'move_upright': return moveUpright(doc, need(args.id, 'id'), need(args.x, 'x'), need(args.y, 'y'));
            case 'move_connection': return moveConnection(doc, need(args.id, 'id'), need(args.from, 'from'), need(args.to, 'to'), need(args.level, 'level'));
            case 'remove': return removeInstance(doc, need(args.id, 'id'));
            default: throw Error(`Unknown action ${args.action as string}.`);
          }
        })();
        latest();
        run(() => store.commit(next));
        return result('Topology updated.', { uprights: Object.keys(s().doc.uprights).filter(id => !s().doc.removed.includes(id)), connections: s().doc.connections.filter(c => !s().doc.removed.includes(c.id)).map(c => c.id) });
      },
    }),
    tool({
      name: 'reset_entire_rack',
      description: 'Reset the whole design to the stock rack (inspector "Reset entire rack"). Undoable.',
      inputSchema: obj({}),
      annotations: { destructiveHint: true },
      execute() { run(() => resetRackWithUndo(store, () => api.scene()?.refitOnNextBuild())); return result('Rack reset.'); },
    }),
    tool({
      name: 'new_design',
      description: 'Start a new, unsaved design from the stock rack (keeps saved designs).',
      inputSchema: obj({}),
      execute() { run(store.newRack); api.scene()?.refitOnNextBuild(); return result('New design started.'); },
    }),

    // ── History ──
    tool<{ limit?: number }>({
      name: 'list_history',
      description: 'The history timeline: each step\'s label and category, the current position and the latest step.',
      inputSchema: obj({ limit: num('Most recent steps to return (default 50).') }),
      annotations: { readOnlyHint: true },
      execute({ limit = 50 }) {
        const t = s().timeline;
        return { position: t.position, latest: t.latest, viewingPast: t.viewing, steps: t.entries.map((e, i) => ({ step: i + 1, label: e.label, category: e.category })).slice(-limit) };
      },
    }),
    tool<{ step: number; restore?: boolean }>({
      name: 'go_to_history_step',
      description: 'Scrub the timeline to a step to view it (0 = start). Edits while viewing apply to the latest design; restore=true instead makes that step the current design as a new step ("Restore").',
      inputSchema: obj({ step: num('Step number.'), restore: bool('Restore this step as the current design.') }, ['step']),
      execute({ step, restore }) { run(() => restore ? store.restoreHistory(step) : store.seekHistory(step)); return result(restore ? `Restored step ${step}.` : `Viewing step ${step}.`); },
    }),
    tool({
      name: 'clear_history',
      description: 'Erase all past history steps, keeping the current design (undo toast can bring them back).',
      inputSchema: obj({}),
      annotations: { destructiveHint: true },
      execute() { run(() => void clearHistoryWithUndo(store)); return result('History cleared.'); },
    }),
    tool<{ play?: boolean }>({
      name: 'play_build_animation',
      description: 'Play (or stop) the cinematic build animation of the rack.',
      inputSchema: obj({ play: bool('true plays (default), false stops.') }),
      execute({ play = true }) { if (!hooks.buildAnimation(play) && play) throw Error('The build animation cannot play right now.'); return play ? 'Playing.' : 'Stopped.'; },
    }),

    // ── Saved designs, files, gyms ──
    tool({
      name: 'list_saved_designs',
      description: 'Designs saved in this browser (Configurations), with which one is open and whether a recovery draft exists.',
      inputSchema: obj({}),
      annotations: { readOnlyHint: true },
      execute: () => ({ active: s().activeId, unsavedChanges: s().dirty, draftAvailable: s().draftAvailable, designs: s().configs.map(c => ({ id: c.id, name: c.name })) }),
    }),
    tool<{ action: 'save' | 'save_copy' | 'open' | 'rename' | 'delete' | 'recover_draft'; name?: string; id?: string }>({
      name: 'manage_saved_design',
      description: 'Configurations menu: save the current design (under name; overwrites the open design), save as a copy, open, rename or delete a saved design, or recover the unsaved draft.',
      inputSchema: obj({ action: str('What to do.', { enum: ['save', 'save_copy', 'open', 'rename', 'delete', 'recover_draft'] }), name: str('Name for save/save_copy/rename.'), id: str('Saved design id for open/rename/delete (default: the open one).') }, ['action']),
      annotations: { destructiveHint: true },
      async execute({ action, name, id }) {
        const target = id ?? s().activeId;
        switch (action) {
          case 'save': case 'save_copy': await store.save(need(name, 'name'), action === 'save_copy'); break;
          case 'open': await store.load(need(target, 'id')); api.scene()?.refitOnNextBuild(); break;
          case 'rename': await store.rename(need(target, 'id'), need(name, 'name')); break;
          case 'delete': await store.deleteConfig(need(target, 'id')); break;
          case 'recover_draft': if (!s().draftAvailable) throw Error('No draft to recover.'); store.recoverDraft(); break;
        }
        return result(`${action} done.`, { active: s().activeId, designs: s().configs.map(c => ({ id: c.id, name: c.name })) });
      },
    }),
    tool({
      name: 'get_design_json',
      description: 'The design and its history as the JSON a "Save JSON" download contains (bos-strength-session format), returned as text instead of downloading.',
      inputSchema: obj({}),
      annotations: { readOnlyHint: true },
      execute: () => store.exportJSON(),
    }),
    tool<{ json: string | Record<string, unknown> }>({
      name: 'load_design_json',
      description: 'Load a design from JSON (a saved session or a bare RackDoc), like "Load JSON".',
      inputSchema: obj({ json: { type: ['string', 'object'], description: 'The file contents.' } }, ['json']),
      annotations: { destructiveHint: true },
      execute({ json }) { run(() => store.importJSON(typeof json === 'string' ? json : JSON.stringify(json))); api.scene()?.refitOnNextBuild(); return result('Design loaded.', { parts: s().resolved.length }); },
    }),
    tool({
      name: 'list_gyms',
      description: 'The pre-built gym gallery: recreations of real garage gyms that can be opened as a starting design.',
      inputSchema: obj({}),
      annotations: { readOnlyHint: true },
      async execute() { return (await loadGyms()).map(g => ({ slug: g.slug, title: g.title, owner: g.owner, summary: g.summary, highlights: g.highlights })); },
    }),
    tool<{ slug: string }>({
      name: 'open_gym',
      description: 'Open a gallery gym as a new unsaved design (the current unsaved work is kept as a saved configuration; undo toast restores).',
      inputSchema: obj({ slug: str('Gym slug from list_gyms.', { enum: [...GYM_SLUGS] }) }, ['slug']),
      annotations: { destructiveHint: true },
      async execute({ slug }) {
        const gym = await loadGym(slug);
        if (!gym) throw Error(`No gym "${slug}".`);
        // The `/?gym=` link is the gallery's own path (useOpenGym): it keeps the draft, shows the undo toast and
        // leaves a shareable URL. Wait for it to swap the design in.
        const before = s().doc;
        hooks.navigate(`/?gym=${encodeURIComponent(slug)}`);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => { stop(); reject(Error(`Timed out opening ${gym.title}.`)); }, 15000);
          const stop = store.subscribe(() => { if (s().doc !== before && s().status.includes(gym.title)) { clearTimeout(timer); stop(); resolve(); } });
        });
        return result(`Opened ${gym.title}.`);
      },
    }),
  ];
  return tools;

  // ── Implementations shared by several tools ──

  function knownPart(part: string) {
    if (s().definitions.some(d => d.id === part) || isSystemPart(part) || floorPart(part) || wallPart(part) || isHangPart(part)) return;
    if (s().definitions.length || !getPartPlacementInfo(part as PartId, s().doc)) throw Error(`Unknown part "${part}". Use search_parts_catalog.`);
  }

  function setParams(id: string, params: NumericParams) {
    const r = instance(id), doc = s().doc, owner = r.ownerId || r.id;
    const accessory = doc.accessories.find(a => a.id === owner), floor = doc.floorItems?.find(i => i.id === r.id), wall = doc.wallItems?.find(i => i.id === r.id);
    const system = doc.systems?.find(x => x.id === owner);
    const bad = (keys: string[], allowed: Iterable<string>) => { const ok = new Set(allowed); const unknown = keys.filter(k => !ok.has(k)); if (unknown.length) throw Error(`Unknown parameter(s) ${unknown.join(', ')}. Allowed: ${[...ok].join(', ')}.`); };
    const keys = Object.keys(params);
    if (floor || wall) {
      const part = (floor ? floorPart(floor.part) : wallPart(wall!.part))!;
      bad(keys, part.params.map(p => p.key));
      const next = coerceFloorParams(part, { ...(floor ?? wall)!.params, ...params });
      run(() => floor ? store.updateFloor(r.id, { params: next }) : store.updateWall(r.id, { params: next }));
    } else if (system) {
      bad(keys, Object.keys({ ...SYSTEM_DEFAULTS[system.part], ...system.params }));
      run(() => store.commit(withSystem(doc, system.part, params, system.id)));
    } else if (accessory) {
      const fields = editableFields(accessory.part, doc), rp = rackPart(accessory.part);
      bad(keys, [...fields.map(f => f.key), ...(rp?.params.map(p => p.key) ?? []), ...Object.keys(partDefaults(doc, accessory.part))]);
      for (const f of fields) if (f.key in params && (params[f.key] < f.min || params[f.key] > f.max)) throw Error(`${f.label} must be between ${f.min} and ${f.max}.`);
      const next = structuredClone(doc), a = next.accessories.find(x => x.id === accessory.id)!;
      const merged = { ...a.params, ...params };
      if (rp) {
        const full = coerceRackParams(rp, { ...rp.defaults, ...merged });
        for (const p of rp.params) { if (full[p.key] === rp.defaults[p.key]) delete merged[p.key]; else merged[p.key] = full[p.key]; }
      }
      a.params = merged;
      run(() => store.commit(next));
    } else {
      const fields = editableFields(r.part, doc);
      bad(keys, fields.map(f => f.key));
      for (const f of fields) if (f.key in params && (params[f.key] < f.min || params[f.key] > f.max)) throw Error(`${f.label} must be between ${f.min} and ${f.max}.`);
      run(() => store.commit(replaceStructurePart(doc, owner, r.part, { ...doc.structure[owner]?.params, ...params })));
    }
    return result('Parameters set.', { params: instance(id).params });
  }

  function stage(args: AddArgs, movingId: string | null) {
    const { part, accept = true } = args, p = part as PartId;
    knownPart(part);
    latest();
    const before = new Set(s().resolved.map(r => r.id));
    if (addsStructure(p) && args.structure_key) {
      const candidate = structureCandidates(s().doc, p).find(c => c.key === args.structure_key);
      if (!candidate) throw Error(`No structure slot "${args.structure_key}". See list_placement_options.`);
      store.cancelPlacement();
      run(() => store.commit(candidate.doc));
      store.select(candidate.ownerId);
      return result(`Added ${nameOf(part)}.`, { added: s().resolved.filter(r => !before.has(r.id)).map(r => r.id) });
    }
    run(() => addPart(store, p, args.paired === undefined ? 'default' : args.paired ? 'pair' : 'single'));
    const st = s();
    if (st.systemChoice) { if (args.system_params) run(() => store.previewSystem(args.system_params!)); }
    else if (st.structureChoice) {
      const slot = args.swap_slot ?? (addsStructure(p) ? undefined : null);
      if (slot === undefined) { store.cancelPlacement(); throw Error('Pass structure_key (new structure) or swap_slot (existing slot). See list_placement_options.'); }
      if (slot) { store.patch({ structureMode: 'swap' }); run(() => store.previewStructure(slot)); }
    } else if (st.placing) {
      if (floorPart(part)) {
        if (args.cradle_key) run(() => store.previewCradle(args.cradle_key!));
        if (args.floor_position || args.rotation_deg !== undefined) {
          const proposal = s().proposal, item = proposal?.doc.floorItems?.find(i => i.id === proposal.ownerId);
          const delta = args.rotation_deg !== undefined && item ? args.rotation_deg * Math.PI / 180 - item.rotation : 0;
          run(() => store.previewFloor(args.floor_position ? toDoc(args.floor_position) : item?.position as [number, number], delta));
        }
      } else if (wallPart(part)) {
        if (args.wall || args.wall_position) {
          const proposal = s().proposal, item = proposal?.doc.wallItems?.find(i => i.id === proposal.ownerId);
          run(() => store.previewWall((args.wall ?? item?.wall ?? 'back') as WallId, (args.wall_position ?? item?.position ?? [0, wallPart(part)!.height ?? 1500]) as [number, number]));
        }
      } else if (isHangPart(part)) {
        if (args.hook) run(() => store.previewHang(args.hook!.panel, args.hook!.slot));
      } else if (args.mount_key) {
        const mount = placementMounts(s().doc, p, movingId).find(m => mountKey(m) === args.mount_key);
        if (!mount) { store.cancelPlacement(); throw Error(`No free mount "${args.mount_key}". See list_placement_options.`); }
        run(() => store.previewMount(mount));
      }
    }
    if (!s().proposal) {
      const why = s().placementText;
      if (accept) store.cancelPlacement();
      throw Error(why ? why.replace(/ · (Click|ESC).*$/, '') : 'It does not fit there.');
    }
    if (!accept) return result(`Staged ${nameOf(part)}: ${s().placementText}. Call accept_placement to place it, or cancel_placement.`);
    run(store.acceptProposal);
    return result(`Added ${nameOf(part)}.`, { added: s().resolved.filter(r => !before.has(r.id)).map(r => r.id), warnings: collectWarnings(s().doc, s().resolved).filter(w => w.ids.some(id => !before.has(id))).map(w => w.message) });
  }

  function move(args: AddArgs & { id: string; upright?: string; face?: Face; hole?: number; along_mm?: number; height_mm?: number }) {
    const r = instance(args.id), doc = s().doc, owner = r.ownerId || r.id;
    if (store.isLocked(r.id)) throw Error(`${args.id} is locked. Unlock it first (set_parts_locked).`);
    latest();
    const accessory = doc.accessories.find(a => a.id === owner), floor = doc.floorItems?.find(i => i.id === r.id), wall = doc.wallItems?.find(i => i.id === r.id), hang = doc.hangItems?.find(h => h.id === r.id);
    if (accessory) {
      if (args.mount_key) {
        const mount = placementMounts(doc, accessory.part, accessory.id).find(m => mountKey(m) === args.mount_key);
        if (!mount) throw Error(`No free mount "${args.mount_key}" for this part. See list_placement_options with moving_id.`);
        const proposal = proposalAt(doc, accessory.part, mount, (args.paired ?? accessory.paired) && !isHostedTarget(mount), accessory.id);
        const collision = proposalCollision(s().resolved, proposal);
        if (collision) throw Error(collision);
        run(() => store.commit(proposal.doc));
      } else {
        if (!isUprightTarget(accessory.target) && (args.upright || args.face || args.hole)) throw Error('This part mounts on a crossmember or host: use mount_key.');
        const next = structuredClone(doc), a = next.accessories.find(x => x.id === accessory.id)!;
        if (isUprightTarget(a.target)) {
          if (args.upright) a.target.uprightId = args.upright;
          if (args.face) a.target.face = args.face;
          if (args.hole !== undefined) a.target.hole = args.hole - 1;
        }
        if (args.paired !== undefined) a.paired = args.paired && !!getPartPlacementInfo(a.part, next)?.paired;
        run(() => store.commit(next));
      }
    } else if (floor) {
      if (args.cradle_key === 'floor') {
        const next = structuredClone(doc), item = next.floorItems!.find(i => i.id === floor.id)!;
        delete item.cradle; item.position = [r.position[0], -r.position[1]]; item.rotation = r.rotation[2];
        run(() => store.commit(next));
      } else if (args.cradle_key) {
        if (!parksInCradles(floor.part)) throw Error('Only barbells park in cradles.');
        store.startPlacement(floor.part, floor.id, r.id);
        run(() => store.previewCradle(args.cradle_key!));
        if (!s().proposal || !s().proposal!.doc.floorItems?.some(i => i.id === floor.id && i.cradle === args.cradle_key)) { store.cancelPlacement(); throw Error(`Cradle "${args.cradle_key}" is not free.`); }
        run(store.acceptProposal);
      } else {
        const patch: { position?: [number, number]; rotation?: number } = {};
        if (args.floor_position) patch.position = toDoc(args.floor_position);
        if (args.rotation_deg !== undefined) patch.rotation = args.rotation_deg * Math.PI / 180;
        if (floor.cradle && patch.position) { const next = structuredClone(doc), item = next.floorItems!.find(i => i.id === floor.id)!; delete item.cradle; Object.assign(item, patch); run(() => store.commit(next)); }
        else run(() => store.updateFloor(floor.id, patch));
      }
    } else if (wall) {
      run(() => store.updateWall(wall.id, { ...(args.wall ? { wall: args.wall as WallId } : {}), position: [args.along_mm ?? args.wall_position?.[0] ?? wall.position[0], args.height_mm ?? args.wall_position?.[1] ?? wall.position[1]] }));
    } else if (hang) {
      if (!args.hook) throw Error('Pass hook {panel, slot}.');
      run(() => store.commit(placeHang(doc, hang.part, args.hook!, hang.id)));
    } else if (doc.uprights[owner] && args.floor_position) {
      run(() => store.commit(moveUpright(doc, owner, args.floor_position![0], args.floor_position![1])));
    } else throw Error('Nothing to move with those arguments (frame members swap with set_variant; systems change with set_part_params).');
    return result('Moved.', { position: vec(instance(args.id).position) });
  }
}

interface AddArgs {
  part: string; paired?: boolean; mount_key?: string; structure_key?: string; swap_slot?: string;
  floor_position?: number[]; rotation_deg?: number; cradle_key?: string; wall?: string; wall_position?: number[];
  hook?: { panel: string; slot: number }; system_params?: NumericParams; accept?: boolean;
}
interface TopologyArgs {
  action: 'add_upright' | 'connect' | 'move_upright' | 'move_connection' | 'remove';
  from?: string; to?: string; direction?: string; span?: number; connection?: string; hole?: number; id?: string; x?: number; y?: number; level?: 'upper' | 'lower';
}
function need<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null || value === '') throw Error(`Missing "${name}".`);
  return value;
}
/** The logo inspector's worker: text or SVG → validated cut contours. */
function validateLogoInWorker(source: LogoSource, bridges: boolean): Promise<ValidatedLogo> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../rack-generator/logos/logo-worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => { worker.terminate(); reject(Error('Logo processing exceeded 10 seconds. Simplify the artwork.')); }, 10000);
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(Error('Logo worker failed.')); };
    worker.onmessage = ({ data }: MessageEvent<{ logo?: ValidatedLogo; error?: string }>) => {
      clearTimeout(timer); worker.terminate();
      if (data.error || !data.logo) reject(Error(data.error ?? 'Logo could not be validated.')); else resolve(data.logo);
    };
    worker.postMessage({ source, bridges });
  });
}
