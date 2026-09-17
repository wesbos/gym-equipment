import { addFloorItem, resolveFloorItems, floorWarnings } from '../../rack-generator/floor-items.ts';
import { resetAppearanceField } from '../../rack-generator/appearance-reset.ts';
import type { FrameFinish } from '../../rack-generator/appearance.ts';
import { addsStructure } from '../../rack-generator/structure-candidates.ts';
import { resetPart } from '../../rack-generator/reset.ts';
import { removeSelection, selectionOwners, sharedFields, type PhysicalInstanceId, type SelectionGesture } from './selection.ts';
import { structureProposalAt, proposalCollision, suggestPlacement, type PlacementProposal } from '../../rack-generator/placement-proposals.ts';
import {
  LocalConfigStorage,
  type ConfigStorage,
  type ConfigCollection,
  type SavedConfig,
  type StorageLike,
} from "./config-storage.ts";
export type { StorageLike } from "./config-storage.ts";
import {
  createAssembly,
  validateAssembly,
  resolveAssembly,
  getPartPlacementInfo,
  addAccessory,
  moveAccessory,
} from "../../rack-generator/assembly.ts";
import type {
  RackDoc,
  ResolvedInstance,
  PartId,
  PartDefinition,
  Target,
} from "../../rack-generator/types.ts";
export type CatalogPart = Omit<PartDefinition, "build">;
export interface BuilderSnapshot {
  inputRevision: number;
  configs: SavedConfig[];
  activeId: string | null;
  dirty: boolean;
  draftAvailable: boolean;
  storageReady: boolean;
  storageError: string | null;
  doc: RackDoc;
  resolved: ResolvedInstance[];
  selection: readonly PhysicalInstanceId[];
  selectionAnchor: PhysicalInstanceId | null;
  selectionTool: boolean;
  /** Last physical ID, for single-inspector compatibility. */
  selected: string | null;
  definitions: CatalogPart[];
  placing: { part: PartId; movingId: string | null } | null;
  structureChoice: PartId | null;
  structureMode: "add" | "swap";
  paired: boolean;
  status: string;
  error: boolean;
  loading: boolean;
  dimensions: string;
  placementText: string;
  proposal: PlacementProposal | null;
  canUndo: boolean;
  canRedo: boolean;
}
export class BuilderStore {
  private listeners = new Set<() => void>();
  private undo: RackDoc[] = [];
  private redo: RackDoc[] = [];
  private state: BuilderSnapshot;
  private repository: ConfigStorage;
  private collection: ConfigCollection = {
    configs: [],
    activeId: null,
    draft: null,
  };
  private writes: Promise<void> = Promise.resolve();
  private storageReadable = true;
  private pendingDraft: RackDoc | null = null;
  private draftQueued = false;
  private gesture = false;
  private gestureOriginal: RackDoc | null = null;
  private gestureRedo: RackDoc[] = [];
  private gestureChanged = false;
  readonly ready: Promise<void>;
  constructor(storage?: StorageLike | ConfigStorage) {
    this.repository =
      storage && "read" in storage ? storage : new LocalConfigStorage(storage);
    const doc = createAssembly(),
      status = "Preparing your workspace…",
      error = false;
    this.state = {
      inputRevision: 0,
      configs: [],
      activeId: null,
      dirty: false,
      draftAvailable: false,
      storageReady: false,
      storageError: null,
      doc,
      resolved: resolveAssembly(doc),
      selection: [],
      selectionAnchor: null,
      selectionTool: false,
      selected: null,
      definitions: [],
      placing: null,
      structureChoice: null,
      structureMode: "add",
      paired: true,
      status,
      error,
      loading: true,
      dimensions: "",
      placementText: "",
      proposal: null,
      canUndo: false,
      canRedo: false,
    };
    this.ready = this.repository
      .read()
      .then((collection) => {
        this.collection = collection;
        const saved = collection.configs.find(
          (c) => c.id === collection.activeId,
        );
        this.patch({
          configs: collection.configs,
          activeId: collection.activeId,
          draftAvailable: !!collection.draft,
          storageReady: true,
        });
        if (!this.state.dirty && saved)
          this.patch({ doc: saved.doc, resolved: resolveAssembly(saved.doc) });
      })
      .catch(() => {
        this.storageReadable = false;
        this.patch({
          storageError: "Saved designs could not be opened. Export your design as JSON before clearing browser storage.",
          storageReady: true,
          status:
            "Saved designs could not be opened. Export your design as JSON before clearing browser storage.",
          error: true,
        });
      });
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  patch = (patch: Partial<BuilderSnapshot>) => {
    if (patch.selected !== undefined && patch.selection === undefined) patch.selection = patch.selected ? [patch.selected] : [];
    if (patch.resolved && !patch.selection) patch.selection = this.state.selection.filter(id => patch.resolved!.some(r => r.id === id));
    if (patch.selection) patch.selected = patch.selection.at(-1) ?? null;
    if (patch.paired !== undefined && patch.paired !== this.state.paired && this.state.placing && !patch.placing) {
      const { part, movingId } = this.state.placing;
      const result = suggestPlacement(this.state.doc, part, patch.paired, movingId);
      patch = { ...patch, proposal: result.proposal, placementText: result.proposal ? `Suggested: ${result.proposal.label}` : `Doesn't fit: ${result.reason}` };
    }
    if (patch.doc || patch.structureMode !== undefined && !("proposal" in patch) || patch.placing === null && patch.structureChoice === null) patch.proposal = null;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  };
  status = (status: string, error = false) => this.patch({ status, error });
  act = (action: () => void) => {
    try {
      action();
    } catch (error) {
      this.status(error instanceof Error ? error.message : String(error), true);
    }
  };
  private mutateStorage(
    update: (current: ConfigCollection) => ConfigCollection,
  ) {
    const operation = this.writes.then(async () => {
      await this.ready;
      if (!this.storageReadable)
        throw new Error(
          "Saved storage could not be read. Export your design as JSON.",
        );
      const next = update(this.collection);
      await this.repository.write(structuredClone(next));
      this.collection = next;
      this.patch({ configs: next.configs, storageError: null });
    });
    this.writes = operation.catch(() => {
      this.patch({
        storageError: "Browser storage failed. Save your design as JSON.",
      });
      this.status("Browser storage failed. Save your design as JSON.", true);
    });
    return operation;
  }
  /** Await pending storage work, useful for adapters and lifecycle tests. */
  flushStorage = async () => {
    await this.ready;
    do {
      const pending = this.writes;
      await pending;
      if (pending === this.writes) break;
    } while (true);
  };
  private autosave() {
    const saved = this.collection.configs.find(
      (c) => c.id === this.state.activeId,
    );
    const dirty =
      !saved || JSON.stringify(saved.doc) !== JSON.stringify(this.state.doc);
    this.patch({ dirty, draftAvailable: false });
    this.pendingDraft = dirty ? this.state.doc : null;
    if (this.draftQueued) return;
    this.draftQueued = true;
    void this.mutateStorage((current) => {
      const draft = this.pendingDraft;
      this.pendingDraft = null;
      this.draftQueued = false;
      return { ...current, draft };
    }).catch(() => {
      this.draftQueued = false;
    });
  }
  save = async (name: string, duplicate = false) => {
    if (!name.trim()) throw new Error("Enter a configuration name.");
    const doc = validateAssembly(this.state.doc);
    const id =
      !duplicate && this.state.activeId
        ? this.state.activeId
        : crypto.randomUUID();
    await this.mutateStorage((current) => {
      const config = { id, name: name.trim(), doc };
      return {
        configs: [...current.configs.filter((c) => c.id !== id), config],
        activeId: id,
        draft: null,
      };
    });
    this.patch({
      activeId: id,
      dirty: JSON.stringify(this.state.doc) !== JSON.stringify(doc),
      draftAvailable: false,
    });
    // A draft queued before this save may have absorbed edits made after the
    // save-time snapshot. Restore the latest working copy after clearing it.
    if (this.state.dirty) this.autosave();
  };
  load = async (id: string) => {
    await this.ready;
    const config = this.collection.configs.find((c) => c.id === id);
    if (!config) throw new Error("Configuration not found.");
    await this.mutateStorage((current) => ({ ...current, activeId: id }));
    this.replaceWorking(config.doc);
    this.patch({ activeId: id, draftAvailable: !!this.collection.draft });
  };
  rename = async (id: string, name: string) => {
    if (!name.trim()) throw new Error("Enter a configuration name.");
    await this.mutateStorage((current) => ({
      ...current,
      configs: current.configs.map((c) =>
        c.id === id ? { ...c, name: name.trim() } : c,
      ),
    }));
  };
  deleteConfig = async (id: string) => {
    await this.mutateStorage((current) => ({
      ...current,
      configs: current.configs.filter((c) => c.id !== id),
      activeId: current.activeId === id ? null : current.activeId,
    }));
    this.patch({
      activeId: this.state.activeId === id ? null : this.state.activeId,
      dirty: true,
    });
  };
  newRack = () => {
    this.commit(createAssembly());
    this.select(null);
    this.patch({
      activeId: null,
      dirty: true,
      inputRevision: this.state.inputRevision + 1,
    });
  };
  recoverDraft = () => {
    if (this.collection.draft) {
      this.commit(this.collection.draft);
      this.patch({ draftAvailable: false });
    }
  };
  private replaceWorking(doc: RackDoc) {
    this.undo = [];
    this.redo = [];
    this.patch({
      inputRevision: this.state.inputRevision + 1,
      doc: validateAssembly(doc),
      resolved: resolveAssembly(doc),
      selection: [],
      selectionAnchor: null,
      selectionTool: false,
      selected: null,
      placing: null,
      structureChoice: null,
      dirty: false,
      canUndo: false,
      canRedo: false,
    });
  }
  beginGesture = () => {
    this.gestureOriginal = structuredClone(this.state.doc);
    this.gestureRedo = [...this.redo];
    this.gesture = true;
    this.gestureChanged = false;
  };
  cancelGesture = () => {
    if (this.gestureOriginal && this.gestureChanged) {
      this.undo.pop(); this.redo = this.gestureRedo;
      const doc = this.gestureOriginal;
      this.patch({ doc, resolved: resolveAssembly(doc), canUndo: !!this.undo.length, canRedo: !!this.redo.length });
      this.autosave();
    }
    this.endGesture();
  };
  endGesture = () => {
    this.gestureOriginal = null;
    this.gesture = false;
    this.gestureChanged = false;
  };
  commit = (input: RackDoc) => {
    const doc = validateAssembly(input),
      resolved = resolveAssembly(doc);
    if (JSON.stringify(doc) === JSON.stringify(this.state.doc)) return;
    if (!this.gesture || !this.gestureChanged)
      this.undo.push(structuredClone(this.state.doc));
    this.gestureChanged = true;
    if (this.undo.length > 100) this.undo.shift();
    this.redo = [];
    this.patch({
      doc,
      resolved,
      placing: null,
      structureChoice: null,
      canUndo: true,
      canRedo: false,
    });
    this.autosave();
  };
  history = (direction: "undo" | "redo") => {
    this.endGesture();
    const source = direction === "undo" ? this.undo : this.redo,
      target = direction === "undo" ? this.redo : this.undo;
    const doc = source.pop();
    if (!doc) return;
    target.push(structuredClone(this.state.doc));
    this.patch({
      inputRevision: this.state.inputRevision + 1,
      doc,
      resolved: resolveAssembly(doc),
      placing: null,
      structureChoice: null,
      canUndo: !!this.undo.length,
      canRedo: !!this.redo.length,
    });
    this.autosave();
  };
  /** Editing targets the owning group; selection remains a physical piece for paint. */
  ownerOf = (id: string | null) =>
    this.state.resolved.find(instance => instance.id === id)?.ownerId || id;
  select = (id: string | null, gesture?: SelectionGesture, order?: readonly string[]) => {
    if (gesture && (this.state.placing || this.state.structureChoice)) return;
    gesture ??= {};
    const physicalId = this.state.resolved.find(r => r.id === id)?.id ?? this.state.resolved.find(r => r.ownerId === id)?.id ?? id;
    const toggle = gesture.metaKey || gesture.ctrlKey;
    let selection = physicalId ? [physicalId] : [];
    if (physicalId && gesture.shiftKey && order && this.state.selectionAnchor && order.includes(this.state.selectionAnchor)) {
      const a = order.indexOf(this.state.selectionAnchor), b = order.indexOf(physicalId);
      if (b >= 0) selection = order.slice(Math.min(a, b), Math.max(a, b) + 1);
      if (toggle) selection = [...new Set([...this.state.selection, ...selection])];
    } else if (physicalId && toggle) selection = this.state.selection.includes(physicalId)
      ? this.state.selection.filter(item => item !== physicalId) : [...this.state.selection, physicalId];
    this.patch({ placing: null, proposal: null, structureChoice: null, selection, selectionAnchor: gesture.shiftKey ? this.state.selectionAnchor : physicalId });
  };
  selectMany = (ids: readonly PhysicalInstanceId[], additive = false) => {
    if (this.state.placing || this.state.structureChoice) return;
    const valid = ids.filter(id => this.state.resolved.some(r => r.id === id));
    this.patch({ selection: [...new Set([...(additive ? this.state.selection : []), ...valid])] });
  };
  escape = () => { this.cancelGesture(); this.patch({ proposal: null, placing: null, structureChoice: null, selection: [], selectionAnchor: null, selectionTool: false }); };
  /** Paint/reset target physical IDs; resetting color leaves explicit steel finishes intact. */
  paintSelection = (color?: string) => {
    if (!this.state.selection.length) return;
    if (!color) {
      const appearance = this.state.selection.reduce((current, id) => resetAppearanceField(current, 'color', id), this.state.doc.appearance ?? {});
      this.commit({ ...this.state.doc, appearance });
      return;
    }
    const appearance = this.state.doc.appearance;
    const overrides = { ...appearance?.overrides }, finishOverrides = { ...appearance?.finishOverrides };
    for (const id of this.state.selection) {
      overrides[id] = color; finishOverrides[id] = 'paint';
    }
    this.commit({ ...this.state.doc, appearance: { ...appearance, overrides, finishOverrides } });
  };
  finishSelection = (finish?: FrameFinish) => {
    if (!this.state.selection.length) return;
    if (!finish) {
      const appearance = this.state.selection.reduce((current, id) => resetAppearanceField(current, 'finish', id), this.state.doc.appearance ?? {});
      this.commit({ ...this.state.doc, appearance });
      return;
    }
    const finishOverrides = { ...this.state.doc.appearance?.finishOverrides };
    for (const id of this.state.selection) finishOverrides[id] = finish;
    this.commit({ ...this.state.doc, appearance: { ...this.state.doc.appearance, finishOverrides } });
  };
  resetSelectionAppearance = () => {
    if (!this.state.selection.length) return;
    const overrides = { ...this.state.doc.appearance?.overrides }, finishOverrides = { ...this.state.doc.appearance?.finishOverrides };
    for (const id of this.state.selection) { delete overrides[id]; delete finishOverrides[id]; }
    this.commit({ ...this.state.doc, appearance: { ...this.state.doc.appearance, overrides, finishOverrides } });
  };
  removeSelected = () => {
    this.commit(removeSelection(this.state.doc, this.state.resolved, this.state.selection));
    this.select(null);
  };
  editSelectionParam = (key: string, value: number) => {
    const instances = this.state.resolved.filter(r => this.state.selection.includes(r.id));
    const field = sharedFields(this.state.doc, instances).find(f => f.key === key);
    if (!field || !Number.isFinite(value) || value < field.min || value > field.max) throw Error('Unsupported shared parameter.');
    const owners = selectionOwners(this.state.resolved, this.state.selection), doc = structuredClone(this.state.doc);
    for (const item of doc.accessories) if (owners.includes(item.id)) item.params[key] = value;
    this.commit(doc);
  };
  resetSelectionParam = (key: string) => {
    const { doc, resolved, selection } = this.state;
    const instances = resolved.filter(r => selection.includes(r.id));
    if (!sharedFields(doc, instances).some(field => field.key === key)) throw Error('Unsupported shared parameter.');
    const next = selectionOwners(resolved, selection).reduce((current, owner) => resetPart(current, owner, key), doc);
    this.commit(next);
  };
  /** Copies complete accessory owners at existing mounts; the user can then move them. */
  duplicateSelected = () => {
    const { doc, resolved, selection } = this.state;
    const instances = resolved.filter(r => selection.includes(r.id));
    if (!instances.length || instances.some(r => r.kind !== 'accessory' || !doc.accessories.some(a => a.id === r.ownerId))) return;
    const owners = selectionOwners(resolved, selection);
    if (resolved.some(r => owners.includes(r.ownerId) && !selection.includes(r.id))) return;
    const next = structuredClone(doc), newOwners: string[] = [];
    for (const owner of owners) {
      const item = doc.accessories.find(a => a.id === owner)!;
      let id: string;
      do { id = `accessory-${next.nextId++}`; } while (next.accessories.some(a => a.id === id) || next.uprights[id] || next.connections.some(c => c.id === id));
      next.accessories.push({ ...structuredClone(item), id }); newOwners.push(id);
      for (const physical of instances.filter(r => r.ownerId === owner)) {
        const color = doc.appearance?.overrides?.[physical.id];
        if (color) { next.appearance ??= {}; next.appearance.overrides ??= {}; next.appearance.overrides[id + physical.id.slice(owner.length)] = color; }
        const finish = doc.appearance?.finishOverrides?.[physical.id];
        if (finish) { next.appearance ??= {}; next.appearance.finishOverrides ??= {}; next.appearance.finishOverrides[id + physical.id.slice(owner.length)] = finish; }
      }
    }
    this.commit(next);
    this.selectMany(this.state.resolved.filter(r => newOwners.includes(r.ownerId)).map(r => r.id));
    this.status('Copies added at original mounts. Select a copy to move it.');
  };
  cancelPlacement = () => this.patch({ placing: null, structureChoice: null });
  startPlacement = (part: PartId, movingId: string | null = null) => {
    if (addsStructure(part)) {
      this.patch({ selected: null, placing: null, structureChoice: part, structureMode: 'add', proposal: null, selectionTool: false });
      return;
    }
    if (!movingId && (this.state.placing?.part === part || this.state.structureChoice === part) && this.state.proposal) {
      this.acceptProposal();
      return;
    }
    if (part === 'rep-nighthawk') {
      const doc = movingId ? structuredClone(this.state.doc) : addFloorItem(this.state.doc);
      const item = movingId ? doc.floorItems!.find(i=>i.id===movingId)! : doc.floorItems!.at(-1)!;
      this.patch({ selected:null, placing:{part,movingId}, structureChoice:null, proposal:{doc,entries:resolveFloorItems([item]),ownerId:item.id,label:'Floor placement'},placementText:'Click floor to place · R rotates · Alt disables snap' });
      return;
    }
    const paired = movingId ? this.state.doc.accessories.find(a => a.id === movingId)?.paired ?? false : this.state.paired;
    const result = suggestPlacement(this.state.doc, part, paired, movingId);
    const info = getPartPlacementInfo(part, this.state.doc);
    const structural = part === 'upright' || !!info?.slots?.length;
    this.patch({ selected: null, placing: structural ? null : { part, movingId }, structureChoice: structural ? part : null,
      paired, structureMode: "swap", proposal: result.proposal,
      placementText: result.proposal ? `Suggested: ${result.proposal.label}` : `Doesn't fit: ${result.reason}` });
  };
  previewFloor = (position?: [number,number], rotationDelta = 0) => {
    const proposal=this.state.proposal;
    if(this.state.placing?.part !== 'rep-nighthawk' || !proposal) return;
    const doc=structuredClone(proposal.doc), item=doc.floorItems!.find(i=>i.id===proposal.ownerId)!;
    if(position) item.position=position;
    item.rotation+=rotationDelta;
    this.patch({proposal:{...proposal,doc,entries:resolveFloorItems([item])},placementText:floorWarnings(doc).some(w=>w.ids.includes(item.id)) ? 'Overlap warning · Click to place anyway' : 'Click floor to place · R rotates · Alt disables snap'});
  };
  updateFloor = (id:string, patch:Partial<import('../../rack-generator/types.ts').FloorItem>) => {
    const doc=structuredClone(this.state.doc),item=doc.floorItems?.find(i=>i.id===id);
    if(item) {Object.assign(item,patch);this.commit(doc);}
  };
  previewStructure = (slot: string) => this.act(() => {
    const part = this.state.structureChoice;
    if (!part) return;
    const proposal = structureProposalAt(this.state.doc, part, slot);
    const collision = proposalCollision(this.state.resolved, proposal);
    this.patch({ proposal: collision ? null : proposal, placementText: collision || `${proposal.label}` });
  });
  acceptProposal = () => this.act(() => {
    const proposal = this.state.proposal;
    if (!proposal || (!this.state.placing && !this.state.structureChoice)) return;
    this.commit(proposal.doc);
    this.select(proposal.ownerId);
  });
  placementDoc = (target: Target) => {
    const { placing, doc, paired } = this.state;
    if (!placing) throw new Error("Select a part first.");
    return placing.movingId
      ? moveAccessory(doc, placing.movingId, target, paired)
      : addAccessory(doc, placing.part, target, paired);
  };
  importJSON = (text: string) => {
    const doc = validateAssembly(JSON.parse(text));
    resolveAssembly(doc);
    this.commit(doc);
    this.patch({ inputRevision: this.state.inputRevision + 1 });
    this.select(null);
  };
}
export function getBuilderStore() {
  let storage: StorageLike | undefined;
  try {
    storage = window.localStorage;
  } catch {}
  return new BuilderStore(storage);
}
