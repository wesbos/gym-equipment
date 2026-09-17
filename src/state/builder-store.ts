import { addsStructure } from '../../rack-generator/structure-candidates.ts';
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
    if (patch.paired !== undefined && patch.paired !== this.state.paired && this.state.placing && !patch.placing) {
      const { part, movingId } = this.state.placing;
      const result = suggestPlacement(this.state.doc, part, patch.paired, movingId);
      patch = { ...patch, proposal: result.proposal, placementText: result.proposal ? `Suggested: ${result.proposal.label} — Place or pick another spot` : `Doesn't fit: ${result.reason}` };
    }
    if (patch.doc || patch.structureMode !== undefined || patch.placing === null && patch.structureChoice === null) patch.proposal = null;
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
      selected: null,
      placing: null,
      structureChoice: null,
      dirty: false,
      canUndo: false,
      canRedo: false,
    });
  }
  beginGesture = () => {
    this.gesture = true;
    this.gestureChanged = false;
  };
  endGesture = () => {
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
  select = (id: string | null) =>
    this.patch({
      selected: id,
      placing: null,
      structureChoice: null,
    });
  cancelPlacement = () => this.patch({ placing: null, structureChoice: null });
  startPlacement = (part: PartId, movingId: string | null = null) => {
    if (addsStructure(part)) {
      this.patch({ selected: null, placing: null, structureChoice: part, structureMode: 'add', proposal: null });
      return;
    }
    if (!movingId && (this.state.placing?.part === part || this.state.structureChoice === part) && this.state.proposal) {
      this.acceptProposal();
      return;
    }
    const paired = movingId ? this.state.doc.accessories.find(a => a.id === movingId)?.paired ?? false : this.state.paired;
    const result = suggestPlacement(this.state.doc, part, paired, movingId);
    const info = getPartPlacementInfo(part, this.state.doc);
    const structural = part === 'upright' || !!info?.slots?.length;
    this.patch({ selected: null, placing: structural ? null : { part, movingId }, structureChoice: structural ? part : null,
      paired, structureMode: "swap", proposal: result.proposal,
      placementText: result.proposal ? `Suggested: ${result.proposal.label} — Place or pick another spot` : `Doesn't fit: ${result.reason}` });
  };
  previewStructure = (slot: string) => this.act(() => {
    const part = this.state.structureChoice;
    if (!part) return;
    const proposal = structureProposalAt(this.state.doc, part, slot);
    const collision = proposalCollision(this.state.resolved, proposal);
    this.patch({ proposal: collision ? null : proposal, placementText: collision || `${proposal.label} — Place or pick another slot` });
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
