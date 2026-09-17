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
  doc: RackDoc;
  resolved: ResolvedInstance[];
  selected: string | null;
  definitions: CatalogPart[];
  placing: { part: PartId; movingId: string | null } | null;
  structureChoice: PartId | null;
  paired: boolean;
  status: string;
  error: boolean;
  loading: boolean;
  dimensions: string;
  placementText: string;
  canUndo: boolean;
  canRedo: boolean;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const STORAGE = "bos-strength-assembly-v1";
export class BuilderStore {
  private listeners = new Set<() => void>();
  private undo: RackDoc[] = [];
  private redo: RackDoc[] = [];
  private state: BuilderSnapshot;
  constructor(private storage?: StorageLike) {
    let doc = createAssembly(),
      status = "Preparing your workspace…",
      error = false;
    try {
      const saved = storage?.getItem(STORAGE);
      if (saved) doc = validateAssembly(JSON.parse(saved));
    } catch {
      status = "Saved design could not be opened. Started a new rack.";
      error = true;
    }
    this.state = {
      doc,
      resolved: resolveAssembly(doc),
      selected: null,
      definitions: [],
      placing: null,
      structureChoice: null,
      paired: true,
      status,
      error,
      loading: true,
      dimensions: "",
      placementText: "",
      canUndo: false,
      canRedo: false,
    };
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  patch = (patch: Partial<BuilderSnapshot>) => {
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
  private persist() {
    try {
      this.storage?.setItem(STORAGE, JSON.stringify(this.state.doc));
    } catch {
      this.status("Browser storage is full. Save your design as JSON.", true);
    }
  }
  commit = (input: RackDoc) => {
    const doc = validateAssembly(input),
      resolved = resolveAssembly(doc);
    this.undo.push(structuredClone(this.state.doc));
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
    this.persist();
  };
  history = (direction: "undo" | "redo") => {
    const source = direction === "undo" ? this.undo : this.redo,
      target = direction === "undo" ? this.redo : this.undo;
    const doc = source.pop();
    if (!doc) return;
    target.push(structuredClone(this.state.doc));
    this.patch({
      doc,
      resolved: resolveAssembly(doc),
      placing: null,
      structureChoice: null,
      canUndo: !!this.undo.length,
      canRedo: !!this.redo.length,
    });
    this.persist();
  };
  select = (id: string | null) =>
    this.patch({
      selected: id,
      placing: null,
      structureChoice: null,
    });
  cancelPlacement = () => this.patch({ placing: null, structureChoice: null });
  startPlacement = (part: PartId, movingId: string | null = null) => {
    const info = getPartPlacementInfo(part, this.state.doc);
    if (part === "upright" || info?.slots?.length) {
      this.patch({ selected: null, placing: null, structureChoice: part });
      return;
    }
    this.patch({
      placing: { part, movingId },
      structureChoice: null,
      paired: movingId
        ? (this.state.doc.accessories.find((a) => a.id === movingId)?.paired ??
          false)
        : this.state.paired,
    });
  };
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
    this.select(null);
  };
}
let sharedStore: BuilderStore | undefined;
export function getBuilderStore() {
  if (!sharedStore) {
    let storage: StorageLike | undefined;
    try {
      storage = window.localStorage;
    } catch {}
    sharedStore = new BuilderStore(storage);
  }
  return sharedStore;
}
