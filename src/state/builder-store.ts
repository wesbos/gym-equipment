import { DocumentHistory, cleanDocument, diffDocuments, applyOps, parseSession, describeChange, sameValue, type TimelineData, type TimelineSnapshot, type HistoryMetadata, type HistoryMark, type HistoryEntry, type SessionDocument } from './history.ts';
import { systemProposal } from '../../rack-generator/system-proposal.ts';
import { isSystemPart, SYSTEM_DEFAULTS, type SystemPartId } from '../../rack-generator/system-types.ts';
import { addFloorItem, resolveFloorItems, floorWarnings, moveFloorGroup } from '../../rack-generator/floor-items.ts';
import { floorPart, isFloorPart } from '../../rack-generator/floor-registry.ts';
import { barSpecOf, freeCradles, parkedParams, parkedPose, parksInCradles, settleBarbells, suggestCradle, type BarCradle } from '../../rack-generator/barbell-cradles.ts';
import { addWallItem, resolveWallItems, wallWarnings, clampWallPosition, roomOf } from '../../rack-generator/wall-items.ts';
import { isWallPart } from '../../rack-generator/wall-registry.ts';
import { isHangPart } from '../../rack-generator/hang-registry.ts';
import { freeSlots, placeHang, reslotHangs, resolveHangItems, type HangTarget } from '../../rack-generator/hang-items.ts';
import type { Room, WallId } from '../../rack-generator/walls.ts';
import { resetAppearanceField } from '../../rack-generator/appearance-reset.ts';
import type { FrameFinish } from '../../rack-generator/appearance.ts';
import { addsStructure } from '../../rack-generator/structure-candidates.ts';
import { resetPart } from '../../rack-generator/reset.ts';
import { removeSelection, selectionOwners, sharedFields, type PhysicalInstanceId, type SelectionGesture } from './selection.ts';
import { structureProposalAt, proposalAt, proposalCollision, suggestPlacement, type PlacementProposal } from '../../rack-generator/placement-proposals.ts';
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
  pairedByDefault,
  addAccessory,
  moveAccessory,
  unpairAccessory,
  rotationMode,
  rotateAccessory,
  setAccessoryRotation,
} from "../../rack-generator/assembly.ts";
import type {
  RackDoc,
  NumericParams,
  ResolvedInstance,
  PartId,
  PartDefinition,
  Target,
  Mount,
  FloorItem,
} from "../../rack-generator/types.ts";
export type CatalogPart = Omit<PartDefinition, "build">;
export interface BuilderSnapshot {
  inputRevision: number;
  timeline: TimelineSnapshot;
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
  placing: { part: PartId; movingId: string | null; physicalId?: string; rotationOnly?: boolean; rotation?: number } | null;
  structureMoveId: string | null;
  systemChoice: SystemPartId | null;
  systemParams: NumericParams;
  structureChoice: PartId | null;
  structureMode: "add" | "swap";
  paired: boolean;
  status: string;
  error: boolean;
  loading: boolean;
  /** The document the scene last finished building (successfully or not); `builtDoc === doc` means settled.
   * Set by the scene once per completed rebuild, including cached rebuilds that never set `loading`. */
  builtDoc: RackDoc | null;
  dimensions: string;
  placementText: string;
  proposal: PlacementProposal | null;
  canUndo: boolean;
  canRedo: boolean;
}
/** Trailing delay before the recovery draft is written (then at the next idle moment). Lifecycle events flush it. */
export const AUTOSAVE_DELAY_MS = 400;
export class BuilderStore {
  private listeners = new Set<() => void>();
  private journal = new DocumentHistory(createAssembly());
  private appliedDoc = createAssembly();
  private state: BuilderSnapshot;
  private repository: ConfigStorage;
  private collection: ConfigCollection = {
    configs: [],
    activeId: null,
    draft: null,
  };
  private writes: Promise<void> = Promise.resolve();
  private storageReadable = true;
  private draftQueued = false;
  private draftDue = false;
  private draftTimer: ReturnType<typeof setTimeout> | undefined;
  private draftIdle: number | undefined;
  /** Continuous gestures preview edits without touching the journal or storage; the entry lands once at the end. */
  private gesture = false;
  private gestureOriginal: RackDoc | null = null;
  private gestureChanged = false;
  private gestureMetadata: HistoryMetadata = {};
  /** Set when the pending gesture entry was appended early (seek/export/lifecycle flush); later moves rewind to it. */
  private gestureMark: HistoryMark | null = null;
  private pendingEntries: { base: readonly HistoryEntry[]; entry: HistoryEntry; entries: readonly HistoryEntry[] } | null = null;
  /** resolveAssembly results already computed for immutable working documents. */
  private resolvedFor = new WeakMap<RackDoc, ResolvedInstance[]>();
  readonly ready: Promise<void>;
  constructor(storage?: StorageLike | ConfigStorage) {
    this.repository =
      storage && "read" in storage ? storage : new LocalConfigStorage(storage);
    const doc = createAssembly(),
      status = "Preparing your workspace…",
      error = false;
    this.state = {
      inputRevision: 0,
      timeline: this.journal.snapshot(0),
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
      systemChoice: null,
      systemParams: {},
      structureChoice: null,
      structureMoveId: null,
      structureMode: "add",
      paired: true,
      status,
      error,
      loading: true,
      builtDoc: null,
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
          this.replaceWorking(saved.doc, saved.timeline);
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
    // The draft is debounced, so write it before the page goes away.
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      const flush = () => this.flushDraft(true);
      window.addEventListener("pagehide", flush);
      window.addEventListener("beforeunload", flush);
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    }
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  patch = (patch: Partial<BuilderSnapshot>) => {
    // Other edits, selection and placement modes invalidate a staged system.
    if (!("systemChoice" in patch) && (patch.doc || patch.selected !== undefined || patch.placing !== undefined || patch.structureChoice !== undefined)) patch.systemChoice = null;
    if (patch.systemChoice === null && this.state.systemChoice && !("proposal" in patch)) patch.proposal = null;
    if (patch.selected !== undefined && patch.selection === undefined) patch.selection = patch.selected ? [patch.selected] : [];
    if (patch.resolved && !patch.selection) patch.selection = this.state.selection.filter(id => patch.resolved!.some(r => r.id === id));
    if (patch.selection) patch.selected = patch.selection.at(-1) ?? null;
    const pairToggle = patch.paired !== undefined && patch.paired !== this.state.paired && this.state.placing && !patch.placing;
    if (pairToggle && isFloorPart(this.state.placing!.part)) { if (!this.state.placing!.movingId) patch = { ...patch, ...this.floorProposal(this.state.placing!.part, null, patch.paired) }; }
    else if (pairToggle && this.state.placing && !isWallPart(this.state.placing.part) && !isHangPart(this.state.placing.part)) {
      const { part } = this.state.placing;
      const { doc, movingId } = this.placementContext(patch.paired);
      let target = this.state.proposal?.target;
      if (!patch.paired && this.state.proposal?.label === 'Move attachment') {
        const item = doc.accessories.find(a => a.id === movingId);
        const piece = this.state.resolved.find(r => r.id === this.state.placing!.physicalId);
        if (item && piece?.mount) target = { ...piece.mount, ...item.target } as Mount;
      }
      const result = target ? this.mountProposal(target, patch.paired) : suggestPlacement(doc, part, patch.paired, movingId);
      patch = { ...patch, proposal: result.proposal, placementText: result.proposal ? `Suggested: ${result.proposal.label}` : `Doesn't fit: ${result.reason}` };
    }
    if (patch.doc || patch.structureMode !== undefined && !("proposal" in patch) || patch.placing === null && patch.structureChoice === null && !patch.systemChoice) patch.proposal = null;
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
    this.flushDraft(true);
    await this.ready;
    do {
      const pending = this.writes;
      await pending;
      if (pending === this.writes) break;
    } while (true);
  };
  /** The applied document the journal ends at; mid-gesture the journal still ends before the gesture. */
  private committedDoc() {
    return this.gesture && this.gestureChanged && !this.gestureMark && this.gestureOriginal ? this.gestureOriginal : this.appliedDoc;
  }
  private isDirty() {
    const saved = this.collection.configs.find((c) => c.id === this.state.activeId);
    return !saved || !sameValue(saved.doc, this.committedDoc()) || !sameValue(saved.timeline, this.journal.data);
  }
  private autosave() {
    this.patch({ dirty: this.isDirty(), draftAvailable: false });
    this.scheduleDraft();
  }
  private cancelDraftTimers() {
    if (this.draftTimer !== undefined) clearTimeout(this.draftTimer);
    if (this.draftIdle !== undefined) globalThis.cancelIdleCallback?.(this.draftIdle);
    this.draftTimer = this.draftIdle = undefined;
  }
  /** Trailing debounce, then idle time: a burst of edits writes the recovery draft once. */
  private scheduleDraft() {
    this.draftDue = true;
    this.cancelDraftTimers();
    this.draftTimer = setTimeout(() => {
      this.draftTimer = undefined;
      if (typeof globalThis.requestIdleCallback === "function")
        this.draftIdle = globalThis.requestIdleCallback(() => { this.draftIdle = undefined; this.flushDraft(); }, { timeout: 1000 });
      else this.flushDraft();
    }, AUTOSAVE_DELAY_MS);
  }
  /** Queue the pending draft write now. `lifecycle` (unload, hide, flushStorage) also captures an in-progress gesture. */
  private flushDraft(lifecycle = false) {
    const live = this.gesture && this.gestureChanged && !this.gestureMark;
    if (!this.draftDue && !(lifecycle && live)) return;
    if (live && !lifecycle) return; // endGesture reschedules
    if (live) this.materializeGesture();
    this.cancelDraftTimers();
    this.draftDue = false;
    if (this.draftQueued) return;
    this.draftQueued = true;
    void this.mutateStorage((current) => {
      // Read the working copy at write time so queued edits coalesce into one write.
      this.draftQueued = false;
      const dirty = this.isDirty();
      return { ...current, draft: dirty ? this.committedDoc() : null, draftTimeline: dirty ? structuredClone(this.journal.data) : undefined };
    }).catch(() => {
      this.draftQueued = false;
    });
  }
  save = async (name: string, duplicate = false) => {
    if (!name.trim()) throw new Error("Enter a configuration name.");
    this.endGesture();
    const doc = cleanDocument(this.appliedDoc), timeline = structuredClone(this.journal.data);
    const id =
      !duplicate && this.state.activeId
        ? this.state.activeId
        : crypto.randomUUID();
    await this.mutateStorage((current) => {
      const config = { id, name: name.trim(), doc, timeline };
      return {
        configs: [...current.configs.filter((c) => c.id !== id), config],
        activeId: id,
        draft: null,
      };
    });
    this.patch({
      activeId: id,
      dirty: !sameValue(this.appliedDoc, doc) || !sameValue(this.journal.data, timeline),
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
    this.replaceWorking(config.doc, config.timeline);
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
    this.commit(createAssembly(), { label: "New rack", replacement: true });
    this.select(null);
    this.patch({
      activeId: null,
      dirty: true,
      inputRevision: this.state.inputRevision + 1,
    });
  };
  recoverDraft = () => {
    if (this.collection.draft) {
      this.replaceWorking(this.collection.draft, this.collection.draftTimeline);
      this.autosave();
      this.patch({ draftAvailable: false });
    }
  };
  private replaceWorking(input: RackDoc, timeline?: TimelineData) {
    const doc = cleanDocument(input);
    this.resetGesture();
    this.journal = new DocumentHistory(doc, timeline ? structuredClone(timeline) : undefined);
    this.appliedDoc = doc;
    this.patch({
      inputRevision: this.state.inputRevision + 1, doc, resolved: resolveAssembly(doc),
      timeline: this.journal.snapshot(this.journal.data.applied),
      selection: [], selectionAnchor: null, selectionTool: false, selected: null,
      placing: null, structureChoice: null, structureMoveId: null, dirty: false,
      canUndo: this.journal.data.applied > 0, canRedo: !!this.journal.data.redo.length,
    });
  }
  getAppliedDoc = () => structuredClone(this.appliedDoc);
  exportJSON = () => (this.materializeGesture(), JSON.stringify({ format: 'bos-strength-session', version: 1,
    doc: this.appliedDoc, timeline: this.journal.data } satisfies SessionDocument, null, 2));
  /** Callback edits run against the applied document, irrespective of the displayed view. */
  edit = (action: (doc: RackDoc) => RackDoc, metadata?: HistoryMetadata) => {
    this.commit(action(this.getAppliedDoc()), { ...metadata, replacement: true });
  };
  beginGesture = () => {
    if (this.gesture) return;
    this.gestureOriginal = this.appliedDoc;
    this.gesture = true; this.gestureChanged = false; this.gestureMetadata = {}; this.gestureMark = null;
  };
  private resetGesture() {
    this.gesture = false; this.gestureChanged = false; this.gestureOriginal = null;
    this.gestureMetadata = {}; this.gestureMark = null; this.pendingEntries = null;
  }
  /** Append the in-progress gesture's entry now (it stays open: a later move rewinds and previews again). */
  private materializeGesture() {
    if (!this.gesture || !this.gestureChanged || this.gestureMark) return;
    const mark = this.journal.mark();
    if (this.journal.append(this.appliedDoc, this.gestureMetadata)) this.gestureMark = mark;
  }
  cancelGesture = () => {
    if (this.gesture && this.gestureChanged && this.gestureOriginal) {
      if (this.gestureMark) this.journal.rewind(this.gestureMark);
      this.appliedDoc = this.gestureOriginal;
      this.resetGesture();
      this.publishApplied(true, true);
    }
    this.resetGesture();
  };
  endGesture = () => {
    const changed = this.gesture && this.gestureChanged;
    if (changed && !this.gestureMark) this.journal.append(this.appliedDoc, this.gestureMetadata);
    this.resetGesture();
    if (!changed) return;
    this.patch({ ...this.timelineState(), dirty: this.isDirty(), draftAvailable: false });
    this.scheduleDraft();
  };
  /** Timeline, showing an in-progress gesture as one live entry (appended to the journal at gesture end). */
  private timelineState(): Pick<BuilderSnapshot, "timeline" | "canUndo" | "canRedo"> {
    const journal = this.journal, data = journal.data;
    if (this.gesture && this.gestureChanged && !this.gestureMark && this.gestureOriginal && !sameValue(this.appliedDoc, this.gestureOriginal)) {
      const described = { ...describeChange(this.gestureOriginal, this.appliedDoc), ...this.gestureMetadata };
      const base = journal.entries(), id = data.events.length + 1, previous = this.pendingEntries;
      const entry = { id, label: described.label, category: described.category };
      const entries = previous && previous.base === base && previous.entry.label === entry.label && previous.entry.category === entry.category
        ? previous.entries : [...base, entry];
      this.pendingEntries = { base, entry, entries };
      return { timeline: { entries, position: id, latest: id, applied: id, viewing: false }, canUndo: true, canRedo: false };
    }
    return { timeline: journal.snapshot(data.applied), canUndo: data.applied > 0, canRedo: !!data.redo.length };
  }
  private resolvedOf(doc: RackDoc) {
    let resolved = this.resolvedFor.get(doc);
    if (!resolved) { resolved = resolveAssembly(doc); this.resolvedFor.set(doc, resolved); }
    return resolved;
  }
  /** Show the applied document; `save` also refreshes dirty state and schedules the recovery draft. */
  private publishApplied(navigation = false, save = false) {
    const doc = this.appliedDoc;
    this.patch({ doc, resolved: this.resolvedOf(doc), placing: null, structureChoice: null,
      structureMoveId: null, ...this.timelineState(),
      ...(navigation ? { inputRevision: this.state.inputRevision + 1 } : {}),
      ...(save ? { dirty: this.isDirty(), draftAvailable: false } : {}),
    });
    if (save) this.scheduleDraft();
  }
  commit = (input: RackDoc, metadata: HistoryMetadata = {}) => {
    const candidate = cleanDocument(input);
    // Diff BEFORE returning to applied state: UI closures may contain an old view.
    // Owner-keyed paths preserve additions and reject edits to owners removed later.
    let doc = this.state.timeline.viewing && !metadata.replacement
      ? applyOps(this.appliedDoc, diffDocuments(this.state.doc, candidate), false, false, true) : candidate;
    // Bars whose cradle went away (removed, moved apart, unpaired) drop to the floor in the same undo step.
    const resolved = resolveAssembly(doc);
    const settled = settleBarbells(doc, resolved, this.state.resolved);
    if (settled.doc === doc) this.resolvedFor.set(doc, resolved);
    doc = settled.doc;
    if (sameValue(doc, this.appliedDoc)) {
      if (this.state.timeline.viewing) this.publishApplied(true);
      return;
    }
    const wasViewing = this.state.timeline.viewing;
    // Gesture: preview only. The whole drag lands as one journal entry (and one draft write) at endGesture.
    // Continuous inputs must bracket their edits (NumericControl, GestureColorInput, GestureRange
    // in components/GestureInputs.tsx) or every intermediate value floods history.
    if (this.gesture) {
      if (this.gestureMark) { this.journal.rewind(this.gestureMark); this.gestureMark = null; }
      this.gestureChanged = true; this.gestureMetadata = metadata; this.appliedDoc = doc;
      this.publishApplied(wasViewing);
      if (!this.state.dirty) this.patch({ dirty: true });
    } else {
      this.journal.append(doc, metadata);
      this.appliedDoc = doc;
      this.publishApplied(wasViewing, true);
    }
    if (settled.dropped.length) this.status(`${settled.dropped.length === 1 ? 'A barbell' : `${settled.dropped.length} barbells`} lost ${settled.dropped.length === 1 ? 'its cradle and was' : 'their cradles and were'} set on the floor.`, true);
  };
  seekHistory = (step: number) => {
    // Validate before touching gesture or visible state (the live gesture entry is a valid step).
    this.materializeGesture();
    const doc = this.journal.seek(step);
    this.endGesture();
    this.patch({ doc, resolved: resolveAssembly(doc), timeline: this.journal.snapshot(step),
      inputRevision: this.state.inputRevision + 1, placing: null, structureChoice: null,
      structureMoveId: null, proposal: null,
    });
  };
  latestHistory = () => { this.materializeGesture(); this.seekHistory(this.journal.data.applied); };
  restoreHistory = (step = this.state.timeline.position) => {
    this.materializeGesture();
    const doc = this.journal.seek(step);
    this.endGesture();
    this.journal.append(doc, { category: 'restore', label: `Restore step ${step}` }, true);
    this.appliedDoc = doc; this.publishApplied(true, true);
  };
  clearHistory = () => {
    this.endGesture(); this.journal = new DocumentHistory(this.appliedDoc);
    this.publishApplied(true, true);
  };
  history = (direction: "undo" | "redo") => {
    this.endGesture();
    if (!this.journal[direction]()) return;
    this.appliedDoc = this.journal.seek(this.journal.data.applied);
    this.publishApplied(true, true);
  };
  /** Editing targets the owning group; selection remains a physical piece for paint. */
  ownerOf = (id: string | null) =>
    this.state.resolved.find(instance => instance.id === id)?.ownerId || id;
  select = (id: string | null, gesture?: SelectionGesture, order?: readonly string[]) => {
    if (gesture && (this.state.placing || this.state.structureChoice || this.state.systemChoice)) return;
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
    this.patch({ placing: null, proposal: null, structureChoice: null, structureMoveId: null, selection, selectionAnchor: gesture.shiftKey ? this.state.selectionAnchor : physicalId });
  };
  selectMany = (ids: readonly PhysicalInstanceId[], additive = false) => {
    if (this.state.placing || this.state.structureChoice || this.state.systemChoice) return;
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
    const before = this.state.doc.hangItems ?? [], selection = this.state.selection;
    this.commit(removeSelection(this.state.doc, this.state.resolved, selection));
    this.select(null);
    // Removing a panel takes its hung attachments with it; say so, undo restores them.
    const taken = before.filter(h => !selection.includes(h.id) && !this.state.doc.hangItems?.some(k => k.id === h.id)).length;
    if (taken) this.status(`Removed ${taken} hung attachment${taken === 1 ? '' : 's'} with the panel · Undo restores`);
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
    if (this.state.timeline.viewing) this.latestHistory();
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
  /** Split only in the staged document; cancel and one undo preserve the original pair. */
  placementContext = (paired = this.state.paired) => {
    const { placing, doc } = this.state;
    const owner = doc.accessories.find(a => a.id === placing?.movingId);
    if (!owner?.paired || paired) return { doc, movingId: placing?.movingId ?? null };
    const pieces = this.state.resolved.filter(r => r.ownerId === owner.id);
    const next = unpairAccessory(doc, owner.id);
    const movingId = pieces[1]?.id === placing?.physicalId ? next.accessories.at(-1)!.id : owner.id;
    return { doc: next, movingId };
  };
  private mountProposal(target: Mount, paired = this.state.paired) {
    try {
      const { doc, movingId } = this.placementContext(paired);
      const angle = this.state.placing?.rotation;
      const base = movingId && angle !== undefined ? setAccessoryRotation(doc, movingId, angle) : doc;
      const proposal = proposalAt(base, this.state.placing!.part, target, paired, movingId);
      const reason = proposalCollision(resolveAssembly(proposal.doc), proposal);
      return { proposal: reason ? null : proposal, reason: reason ?? '' };
    } catch (error) { return { proposal: null, reason: (error as Error).message }; }
  }
  previewMount = (target: Mount) => {
    const result = this.mountProposal(target);
    this.patch({ proposal: result.proposal, placementText: result.proposal ? `${result.proposal.label} · Click to place · ESC cancels` : `Won’t fit: ${result.reason}` });
  };
  rotateMounted = (id: string, direction = 1) => {
    const ownerId = this.ownerOf(id)!;
    if (!rotationMode(this.state.doc, ownerId).supported) return false;
    if (!this.state.placing) {
      this.pickup(id);
      const placing = this.getSnapshot().placing;
      if (!placing) return false;
      this.patch({ placing: { ...placing, rotationOnly: true } });
    }
    const proposal = this.state.proposal;
    if (!proposal || isFloorPart(this.state.placing?.part) || isWallPart(this.state.placing?.part) || isHangPart(this.state.placing?.part)) return false;
    this.act(() => {
      const mode = rotationMode(proposal.doc, proposal.ownerId);
      const doc = rotateAccessory(proposal.doc, proposal.ownerId, direction * mode.step);
      const entries = resolveAssembly(doc).filter(r => r.ownerId === proposal.ownerId);
      const next = { ...proposal, doc, entries };
      const collision = proposalCollision(resolveAssembly(doc), next);
      this.patch({ placing: { ...this.state.placing!, rotation: doc.accessories.find(a => a.id === proposal.ownerId)!.rotation }, proposal: next, placementText: `${mode.label} · ${collision ? 'Overlap warning · ' : ''}Click to apply · ESC cancels` });
    });
    return true;
  };
  pickup = (physicalId: string) => {
    const item = this.state.resolved.find(r => r.id === physicalId);
    if (!item) return;
    if (item.kind === 'structure') {
      this.select(item.id);
      this.patch({ structureMoveId: item.ownerId });
      return;
    }
    if (item.kind === 'floor-item' || item.kind === 'wall-item' || this.state.doc.accessories.some(a => a.id === item.ownerId)) this.startPlacement(item.part, item.ownerId, item.id);
  };
  previewSystem = (patch: NumericParams) => {
    const part = this.state.systemChoice;
    if (!part) return;
    const systemParams = { ...this.state.systemParams, ...patch };
    const result = systemProposal(this.state.doc, part, systemParams);
    this.patch({ systemParams, proposal: result.proposal,
      placementText: result.proposal ? `Suggested: ${result.proposal.label}` : `Doesn't fit: ${result.reason}` });
  };
  cancelPlacement = () => this.patch({ placing: null, structureChoice: null });
  startPlacement = (part: PartId, movingId: string | null = null, physicalId = this.state.selected ?? undefined) => {
    if (this.state.timeline.viewing) this.latestHistory();
    if (isSystemPart(part)) {
      const result = systemProposal(this.state.doc, part);
      this.patch({ selected: null, placing: null, structureChoice: null, systemChoice: part, systemParams: { ...SYSTEM_DEFAULTS[part] },
        selectionTool: false, proposal: result.proposal,
        placementText: result.proposal ? `Suggested: ${result.proposal.label}` : `Doesn't fit: ${result.reason}` });
      return;
    }
    if (addsStructure(part)) {
      this.patch({ selected: null, placing: null, structureChoice: part, structureMode: 'add', proposal: null, selectionTool: false });
      return;
    }
    if (!movingId && (this.state.placing?.part === part || this.state.structureChoice === part) && this.state.proposal) {
      this.acceptProposal();
      return;
    }
    if (isFloorPart(part)) {
      const paired = !movingId && !!floorPart(part)?.pair;
      this.patch({ selected:null, placing:{part,movingId}, structureChoice:null, paired, ...this.floorProposal(part, movingId, paired) });
      return;
    }
    if (isWallPart(part)) {
      this.patch({ selected:null, placing:{part,movingId}, structureChoice:null, ...this.wallProposal(part, movingId) });
      return;
    }
    if (isHangPart(part)) {
      this.patch({ selected:null, placing:{part,movingId}, structureChoice:null, ...this.hangProposal(part, movingId) });
      return;
    }
    // Each new placement starts from the part's own default, not the last choice.
    const paired = movingId ? this.state.doc.accessories.find(a => a.id === movingId)?.paired ?? false : pairedByDefault(part, this.state.doc);
    const result = suggestPlacement(this.state.doc, part, paired, movingId);
    const info = getPartPlacementInfo(part, this.state.doc);
    const structural = part === 'upright' || !!info?.slots?.length;
    this.patch({ selected: null, placing: structural ? null : { part, movingId, physicalId, rotation: this.state.doc.accessories.find(a => a.id === movingId)?.rotation }, structureChoice: structural ? part : null,
      paired, structureMode: "swap", proposal: result.proposal,
      placementText: result.proposal ? `Suggested: ${result.proposal.label}` : `Doesn't fit: ${result.reason}` });
    if (movingId) {
      const entries = this.state.resolved.filter(r => r.ownerId === movingId);
      const item = this.state.doc.accessories.find(a => a.id === movingId)!;
      const target = entries[0]?.mount ? { ...entries[0].mount, ...item.target } as Mount : undefined;
      this.patch({ proposal: { doc: this.state.doc, entries, ownerId: movingId, target, label: 'Move attachment' }, placementText: 'Choose a mount · Click to place · ESC cancels' });
    }
  };
  /** Staged floor ghost: the moving item, or a fresh unit (plus its pair for pairable parts). Parking parts
   * (barbells) start in the suggested free cradle and fall back to the floor. */
  private floorProposal(part: PartId, movingId: string | null, paired = this.state.paired) {
    const doc = movingId ? structuredClone(this.state.doc) : addFloorItem(this.state.doc, part, undefined, paired);
    const items = movingId ? doc.floorItems!.filter(i=>i.id===movingId) : doc.floorItems!.slice(this.state.doc.floorItems?.length ?? 0);
    const parks = parksInCradles(part), cradle = parks && !movingId ? suggestCradle(freeCradles(this.state.resolved, doc.floorItems, items[0].id)) : null;
    if (cradle) this.parkItem(items[0], cradle);
    const ids = items.map(i => i.id), entries = items.some(i => i.cradle) ? resolveAssembly(doc).filter(e => ids.includes(e.id)) : resolveFloorItems(items);
    return { proposal:{doc,entries,ownerId:items[0].id,label:parks ? 'Park barbell' : 'Floor placement'}, placementText:parks ? `${cradle ? `Suggested: ${cradle.label} · ` : ''}Click a highlighted cradle or the floor · ESC cancels` : 'Click floor to place · R rotates · Alt disables snap' };
  }
  private parkItem(item: FloorItem, cradle: BarCradle) {
    const { position } = parkedPose(cradle, barSpecOf(item));
    Object.assign(item, { cradle: cradle.key, position: [position[0], -position[1]], rotation: cradle.yaw });
  }
  /** Parking parts: stage the bar in a free cradle (one bar per cradle; the moving bar's own cradle counts as free). */
  previewCradle = (key: string) => {
    const proposal = this.state.proposal;
    if (!parksInCradles(this.state.placing?.part) || !proposal) return;
    const doc = structuredClone(proposal.doc), item = doc.floorItems!.find(i => i.id === proposal.ownerId)!;
    const cradle = freeCradles(this.state.resolved, doc.floorItems, item.id).find(c => c.key === key);
    if (!cradle || item.cradle === key) return;
    this.parkItem(item, cradle);
    const [entry] = resolveFloorItems([item]);
    this.patch({ proposal: { ...proposal, doc, entries: [{ ...entry, ...parkedPose(cradle, barSpecOf(item)), params: parkedParams(item.part, entry.params) }] }, placementText: `${cradle.label} · Click to park · ESC cancels` });
  };
  previewFloor = (position?: [number,number], rotationDelta = 0) => {
    const proposal=this.state.proposal;
    if(!isFloorPart(this.state.placing?.part) || !proposal) return;
    const doc=structuredClone(proposal.doc), ids=proposal.entries.map(e=>e.id), items=doc.floorItems!.filter(i=>ids.includes(i.id));
    if (!position && items.some(i=>i.cradle)) return;
    for (const item of items) delete item.cradle;
    moveFloorGroup(items, position, rotationDelta);
    this.patch({proposal:{...proposal,doc,entries:resolveFloorItems(items)},placementText:floorWarnings(doc, ids).length ? 'Overlap warning · Click to place anyway' : 'Click floor to place · R rotates · Alt disables snap'});
  };
  updateFloor = (id:string, patch:Partial<import('../../rack-generator/types.ts').FloorItem>) => {
    const doc=structuredClone(this.state.doc),item=doc.floorItems?.find(i=>i.id===id);
    if(item) {Object.assign(item,patch);this.commit(doc);}
  };
  /** Staged wall ghost: the moving item, or a fresh one at its suggested spot beside the rack. */
  private wallProposal(part: PartId, movingId: string | null) {
    const doc = movingId ? structuredClone(this.state.doc) : addWallItem(this.state.doc, part);
    const item = movingId ? doc.wallItems!.find(i=>i.id===movingId)! : doc.wallItems!.at(-1)!;
    return { proposal:{doc,entries:this.wallEntries(doc,item.id),ownerId:item.id,label:'Wall placement'}, placementText:'Click a wall to place · Alt disables snap · ESC cancels' };
  }
  /** A wall item's ghost carries its hung attachments. */
  private wallEntries(doc: RackDoc, id: string) {
    return [...resolveWallItems(doc.wallItems!.filter(i=>i.id===id),roomOf(doc)), ...resolveHangItems(doc,(doc.hangItems ?? []).filter(h=>h.panel===id))];
  }
  /** Staged attachment on `target`, else its current hook (moving) or the first free hook. */
  private hangProposal(part: PartId, movingId: string | null, target?: HangTarget) {
    const doc = this.state.doc, current = doc.hangItems?.find(h => h.id === movingId);
    if (!doc.wallItems?.length) return { proposal: null, placementText: 'Add a wall panel first · ESC cancels' };
    const slot = target ?? (current ? { panel: current.panel, slot: current.slot } : freeSlots(doc, part)[0]);
    if (!slot) return { proposal: null, placementText: 'No free hook fits this attachment · ESC cancels' };
    const next = placeHang(doc, part, slot, movingId), id = movingId ?? next.hangItems!.at(-1)!.id;
    return { proposal: { doc: next, entries: resolveHangItems(next, next.hangItems!.filter(h => h.id === id)), ownerId: id, label: 'Hang attachment' }, placementText: 'Click a highlighted hook · ESC cancels' };
  }
  previewHang = (panel: string, slot: number) => {
    const placing = this.state.placing;
    if (!isHangPart(placing?.part)) return;
    this.act(() => this.patch(this.hangProposal(placing!.part, placing!.movingId, { panel, slot })));
  };
  previewWall = (wall: WallId, position: [number,number], snap = true) => {
    const proposal=this.state.proposal;
    if(!isWallPart(this.state.placing?.part) || !proposal) return;
    const doc=structuredClone(proposal.doc), item=doc.wallItems!.find(i=>i.id===proposal.ownerId)!;
    item.wall=wall; item.position=clampWallPosition(roomOf(doc), item, wall, position, snap);
    this.patch({proposal:{...proposal,doc,entries:this.wallEntries(doc,item.id)},placementText:wallWarnings(doc).some(w=>w.ids.includes(item.id)) ? 'Overlap warning · Click to place anyway' : 'Click a wall to place · Alt disables snap · ESC cancels'});
  };
  /** Wall edits keep the face on its wall; only a new `position` snaps. */
  updateWall = (id:string, patch:Partial<import('../../rack-generator/types.ts').WallItem>, snap = true) => {
    const doc=structuredClone(this.state.doc),item=doc.wallItems?.find(i=>i.id===id);
    if(!item) return;
    const previous=item.params;
    Object.assign(item,patch); item.position=clampWallPosition(roomOf(doc), item, item.wall, item.position, snap && !!patch.position);
    const dropped=patch.params ? reslotHangs(doc, id, previous) : [];
    this.commit(doc);
    if(dropped.length) this.status(`${dropped.length} hung attachment${dropped.length === 1 ? '' : 's'} had no matching hook and ${dropped.length === 1 ? 'was' : 'were'} removed · Undo restores`);
  };
  /** Moves one wall plane; its items keep their wall coordinates and stay on the (resized) walls. */
  setRoom = (patch: Partial<Room>) => {
    const doc=structuredClone(this.state.doc); doc.room={...roomOf(doc),...patch};
    for(const item of doc.wallItems ?? []) item.position=clampWallPosition(doc.room, item, item.wall, item.position, false);
    this.commit(doc);
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
    if (!proposal || (!this.state.placing && !this.state.structureChoice && !this.state.systemChoice)) return;
    this.commit(proposal.doc);
    this.select(proposal.ownerId);
  });
  placementDoc = (target: Target) => {
    const { placing, paired } = this.state;
    const { doc, movingId } = this.placementContext();
    if (!placing) throw new Error("Select a part first.");
    return movingId
      ? moveAccessory(doc, movingId, target, paired)
      : addAccessory(doc, placing.part, target, paired);
  };
  importJSON = (text: string) => {
    const { doc, timeline } = parseSession(JSON.parse(text));
    if (timeline) { this.replaceWorking(doc, timeline); this.autosave(); }
    else {
      this.endGesture();
      this.commit(doc, { label: 'Import rack', replacement: true });
      this.patch({ inputRevision: this.state.inputRevision + 1 });
    }
    this.select(null);
  };
  /**
   * Opens a ready-made design (a gallery gym) as a new, unsaved design. Unsaved work is never lost:
   * a pending draft is kept as a saved configuration first, then the opened design becomes the draft.
   * Resolves to the name the previous draft was kept under, if there was one.
   */
  openDesign = async (input: RackDoc, title: string): Promise<string | null> => {
    await this.ready;
    this.endGesture();
    const doc = cleanDocument(input);
    // Let a queued autosave land so the current working copy is the stored draft.
    if (this.state.dirty) this.autosave();
    await this.flushStorage();
    // A draft identical to its saved configuration, or an untouched starter rack, holds no work to keep.
    const same = (a: RackDoc, b: RackDoc) => JSON.stringify(cleanDocument(a)) === JSON.stringify(cleanDocument(b));
    const { draft } = this.collection, saved = this.collection.configs.find((c) => c.id === this.collection.activeId);
    const keep = !!draft && !same(draft, saved?.doc ?? createAssembly());
    const keptName = keep ? `Unsaved draft (before ${title})` : null;
    await this.mutateStorage((current) => ({
      configs: keep && current.draft
        ? [...current.configs, { id: crypto.randomUUID(), name: keptName!, doc: cleanDocument(current.draft), ...(current.draftTimeline ? { timeline: current.draftTimeline } : {}) }]
        : current.configs,
      activeId: null,
      draft: null,
    }));
    this.replaceWorking(doc);
    this.patch({ activeId: null, draftAvailable: false });
    this.autosave();
    this.status(keptName ? `Opened ${title}. Your previous unsaved design was kept as “${keptName}”.` : `Opened ${title} as a new design.`);
    return keptName;
  };
}
export function getBuilderStore() {
  let storage: StorageLike | undefined;
  try {
    storage = window.localStorage;
  } catch {}
  return new BuilderStore(storage);
}
