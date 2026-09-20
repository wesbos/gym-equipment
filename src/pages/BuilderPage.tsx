import { HistoryTimeline, historyKeyStep } from '../components/HistoryTimeline.tsx';
import { rotationMode } from '../../rack-generator/assembly.ts';
import { CableSmithControls, SystemPlacementOptions } from '../components/CableSmithControls.tsx';
import { isSystemPart } from '../../rack-generator/system-types.ts';
import { FloorInspector } from '../components/FloorInspector.tsx';
import { PlateStackEditor } from '../components/PlateStackEditor.tsx';
import { WallInspector } from '../components/WallInspector.tsx';
import { wallWarnings } from '../../rack-generator/wall-items.ts';
import { HangInspector } from '../components/HangInspector.tsx';
import { hangWarnings } from '../../rack-generator/hang-items.ts';
import { floorWarnings } from '../../rack-generator/floor-items.ts';
import { floorPart } from '../../rack-generator/floor-registry.ts';
import { RackPartControls } from '../components/RackPartControls.tsx';
import { isUprightTarget } from '../../rack-generator/rack-targets.ts';
import { LogoControls } from '../components/LogoControls.tsx';
import { addsStructure } from '../../rack-generator/structure-candidates.ts';
import { VendorControls, VendorCredit } from '../components/VendorControls.tsx';
import { editableFields } from '../state/selection.ts';
import { BulkInspector } from '../components/BulkInspector.tsx';
import { ExportMenu } from '../components/ExportMenu.tsx';
import { dimensionOptions } from '../../rack-generator/standards.ts';
import { swapCandidates, swapCandidate } from '../../rack-generator/swap.ts';
import { ResetButton } from '../components/ResetButton.tsx';
import { dimensionDefaults, resetDimensions, partDefaults, resetPart, placementDefaults, defaultVariant } from '../../rack-generator/reset.ts';
import { gridProfile } from '../../rack-generator/profiles.ts';
import { RackPresets } from '../components/RackPresets.tsx';
import { TopologyEditor } from '../components/TopologyEditor.tsx';
import { structureSlots } from '../../rack-generator/topology.ts';
import { snapDimensions, stepDimension } from '../../rack-generator/grid.ts';
import { NumericControl } from "../components/NumericControl.tsx";
import { ConfigManager } from "../components/ConfigManager.tsx";
import { PartGallery, GalleryLauncher, CompactCatalog, BrowseCategories, CATALOG_PART_IDS } from "../components/PartGallery/index.ts";
import { AppearanceControls } from "../components/AppearanceControls.tsx";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "@tanstack/react-router";
import { getBuilderStore, type BuilderSnapshot, type BuilderStore, type CatalogPart } from "../state/builder-store.ts";
import { shallowEqual, useStoreSelector } from "../state/use-store.ts";
import { useOpenGym } from "../gyms/useOpenGym.ts";
import { createBuilderScene } from "../scenes/builder-scene.ts";
import {
  createAssembly,
  getPartPlacementInfo,
  pairedByDefault,
  getAvailableStructure,
  restoreInstance,
  replaceStructurePart,
  resizeAssembly,
  removeInstance,
  unpairAccessory,
  STRUCTURE_SLOTS,
} from "../../rack-generator/assembly.ts";
import { detectCollisions } from "../../rack-generator/assembly-collisions.ts";
import type {
  PartId,
  Face,
  UprightId,
  PlacementField,
} from "../../rack-generator/types.ts";
import "../../rack-generator/builder.css";
import "../components/history-timeline.css";
// Catalog sections (and the parts gallery's categories) live in components/PartGallery/gallery-model.ts.
const allParts = CATALOG_PART_IDS;
const cleanName = (name: string) => name.replace(/^BOS STRENGTH\s*/, "");
/** Display and search names per definitions list (computed once per worker load, shared by every component). */
const namesCache = new WeakMap<readonly CatalogPart[], { name: (part: string) => string; lower: (part: string) => string; defaults: (part: string) => CatalogPart["defaults"] | undefined }>();
function partNames(definitions: readonly CatalogPart[]) {
  let names = namesCache.get(definitions);
  if (!names) {
    const byId = new Map(definitions.map(d => [d.id as string, d]));
    const display = new Map<string, string>(), lower = new Map<string, string>();
    const name = (part: string) => { let n = display.get(part); if (n === undefined) { n = (byId.has(part) ? cleanName(byId.get(part)!.name) : "") || part; display.set(part, n); } return n; };
    names = {
      name,
      lower: part => { let n = lower.get(part); if (n === undefined) { n = name(part).toLowerCase(); lower.set(part, n); } return n; },
      defaults: part => byId.get(part)?.defaults,
    };
    namesCache.set(definitions, names);
  }
  return names;
}
const usePartNames = (store: BuilderStore) => partNames(useStoreSelector(store, s => s.definitions));
function download(blob: Blob, filename: string) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
type InspectorRoute = { kind: "floor" | "wall" | "hang"; id: string } | { kind: "full" };
/** Which inspector the selection needs. Floor, wall and hang items get their own inspectors, which subscribe to their
 * item only, so dragging one does not re-render the generic inspector. */
function inspectorRoute(s: BuilderSnapshot): InspectorRoute {
  if (s.structureChoice || s.selection.length > 1) return { kind: "full" };
  const ownerId = s.resolved.find(r => r.id === s.selected)?.ownerId || s.selected;
  const entry = s.doc.accessories.find(a => a.id === ownerId),
    physical = s.resolved.find(r => r.id === s.selected) || s.resolved.find(r => r.ownerId === s.selected);
  const part = entry?.part || (ownerId ? s.doc.structure[ownerId]?.part : undefined) || physical?.part;
  if (!part || !physical || isSystemPart(part)) return { kind: "full" };
  if (physical.kind === "floor-item") return { kind: "floor", id: physical.id };
  if (physical.kind === "wall-item") return { kind: s.doc.hangItems?.some(h => h.id === physical.id) ? "hang" : "wall", id: physical.id };
  return { kind: "full" };
}
function Inspector({ store }: { store: BuilderStore }) {
  const [snapHint, setSnapHint] = useState("");
  const route = useStoreSelector(store, inspectorRoute, shallowEqual);
  if (route.kind === "floor") return <FloorInspector store={store} id={route.id} />;
  if (route.kind === "hang") return <HangInspector store={store} id={route.id} />;
  if (route.kind === "wall") return <WallInspector store={store} id={route.id} />;
  return <FullInspector store={store} snapHint={snapHint} setSnapHint={setSnapHint} />;
}
function FullInspector({ store, snapHint, setSnapHint }: { store: BuilderStore; snapHint: string; setSnapHint: (hint: string) => void }) {
  // Everything this inspector reads, and nothing placement previews change (proposal, placement text, pointer state).
  const state = useStoreSelector(store, s => ({ doc: s.doc, resolved: s.resolved, selected: s.selected, selection: s.selection,
    structureChoice: s.structureChoice, structureMode: s.structureMode, structureMoveId: s.structureMoveId, definitions: s.definitions }), shallowEqual),
    { doc, resolved, selected, structureChoice, definitions } = state;
  const nameOf = partNames(definitions).name;
  const ownerId = store.ownerOf(selected);
  const entry = doc.accessories.find((a) => a.id === ownerId),
    physical =
      resolved.find((r) => r.id === selected) ||
      resolved.find((r) => r.ownerId === selected);
  const part =
    entry?.part ||
    (ownerId ? doc.structure[ownerId]?.part : undefined) ||
    physical?.part;
  const info = part ? getPartPlacementInfo(part, doc) : null;
  const submit = (
    event: FormEvent<HTMLFormElement>,
    action: (data: FormData) => void,
  ) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    store.act(() => action(data));
  };
  if (structureChoice) {
    const slots = swapCandidates(doc, structureChoice).filter(candidate => candidate.valid);
    return (
      <>
        <h2 id="selection-title">{nameOf(structureChoice)}</h2>
        <div id="inspector" className="inspector-fields">
          {addsStructure(structureChoice) && <div role="group" aria-label="Structure mode">
            <button aria-pressed={state.structureMode === 'add'} onClick={() => store.patch({ structureMode: 'add' })}>Add structure</button>
            <button aria-pressed={state.structureMode === 'swap'} onClick={() => store.patch({ structureMode: 'swap' })}>Swap</button>
          </div>}
          {state.structureMode === 'add' && <TopologyEditor doc={doc} store={store} selected={null} />}
          {state.structureMode === 'swap' && slots.map((slot) => (
            <button
              key={slot.ownerId}
              onClick={() => store.previewStructure(slot.ownerId)}
            >
              {resolved.some((r) => r.ownerId === slot.ownerId) ? "Replace" : "Add"}{" "}
              {slot.ownerId.replaceAll("-", " ")}
            </button>
          ))}
          {state.structureMode === 'swap' && !slots.length && (
            <p>
              {structureChoice === "upright"
                ? "No upright slots"
                : "Missing supporting uprights"}
            </p>
          )}
        </div>
      </>
    );
  }
  if (state.selection.length > 1) return <BulkInspector store={store} />;
  if (part && isSystemPart(part)) return <h2 id="selection-title">{nameOf(part)}</h2>;
  if (!part || !physical)
    return (
      <>
        <h2 id="selection-title">Rack settings</h2>
        <TopologyEditor key={JSON.stringify(doc)} doc={doc} store={store} selected={ownerId} moveRequested={state.structureMoveId === ownerId} />
        <form id="frame-form" onSubmit={e => { e.preventDefault(); store.endGesture(); }}>
          {(['height', 'width', 'depth'] as const).map(key => {
            const factor = 1;
            const label = key === 'height' ? 'Upright height' : `Clear rack ${key}`;
            return <Field key={key} label={label}><div className="input-wrap">
              <NumericControl defaultValue={dimensionDefaults(doc)[key] / factor} standardOptions={dimensionOptions(doc.rack, key, doc.profileId)} name={key === 'height' ? 'heightIn' : key} label={label}
                value={doc.rack[key] / factor} min={key === 'height' ? 1000 : key === 'width' ? 400 : 300}
                max={key === 'height' ? 4000 : key === 'width' ? 2000 : 1500} step={doc.rack.pitch / factor}
                normalize={value => {
                  const current = store.getSnapshot().doc;
                  const target = snapDimensions(current.rack, { [key]: value * factor }, current.profileId)[key];
                  setSnapHint(`Snapped ${key} target: ${target} mm`);
                  return target / factor;
                }}
                advance={(value, direction) => {
                  const current = store.getSnapshot().doc;
                  return stepDimension(current.rack, key, value * factor, direction, current.profileId) / factor;
                }}
                onGestureStart={store.beginGesture} onGestureEnd={store.endGesture}
                onValue={value => store.act(() => store.commit(resizeAssembly(store.getSnapshot().doc, { [key]: value * factor })))} />
              <span>mm</span>
            </div></Field>;
          })}
          <button type="button" onClick={() => store.act(() => { store.endGesture(); store.edit(current => resetDimensions(current)); })}>Reset dimensions</button>
          <output aria-live="polite">{snapHint || `Grid: ${doc.rack.pitch} mm · depths ${gridProfile(doc.profileId).depths.join(' / ')} mm`}</output>
        </form>
      </>
    );
  if (physical.kind === 'floor-item') return <FloorInspector store={store} id={physical.id} />;
  if (physical.kind === 'wall-item') return doc.hangItems?.some(h => h.id === physical.id) ? <HangInspector store={store} id={physical.id} /> : <WallInspector store={store} id={physical.id} />;
  const fields = editableFields(part, doc);
  const variants = allParts.filter((id) =>
    entry
      ? getPartPlacementInfo(id, doc)?.family === info?.family &&
        !getPartPlacementInfo(id, doc)?.slots?.length &&
        id !== "upright"
      : getPartPlacementInfo(id, doc)?.slots?.includes(
          physical.ownerId || physical.id,
        ),
  );
  const placementDefault = entry ? placementDefaults(doc, entry) : undefined;
  const resetVariant = defaultVariant(doc, ownerId!);
  const spanning = part.startsWith("safety") || part.startsWith("pullup");
  const fixedHole =
    info?.fixedHole !== undefined ||
    part === "pullup-multigrip" ||
    part === "pullup-sphere";
  return (
    <>
      <h2 id="selection-title">{nameOf(part)}</h2>
      <TopologyEditor key={JSON.stringify(doc)} doc={doc} store={store} selected={ownerId} moveRequested={state.structureMoveId === ownerId} />
      <div id="inspector" className="inspector-fields">
        <form
          className="selection-form"
          key={JSON.stringify([selected, part])}
          onSubmit={(e) =>
            submit(e, (data) => {
              const variant = (data.get("variant") || part) as PartId;
              const params =
                variant === part
                  ? Object.fromEntries(
                      fields.map((f) => [f.key, Number(data.get(f.key))]),
                    )
                  : {};
              if (entry) {
                const next = structuredClone(doc),
                  item = next.accessories.find((a) => a.id === entry.id)!;
                item.params =
                  variant === part ? { ...item.params, ...params } : {};
                item.part = variant;
                const uprightId = data.get("upright") as UprightId;
                if (isUprightTarget(entry.target)) item.target = {
                  uprightId,
                  face: spanning
                    ? uprightId.endsWith("left")
                      ? "right"
                      : "left"
                    : (data.get("face") as Face),
                  hole: fixedHole
                    ? entry.target.hole
                    : Number(data.get("hole")) - 1,
                };
                if (item.spanTo && data.get("spanTo")) item.spanTo = String(data.get("spanTo"));
                // An unpairable part submits no checkbox: adopt the new variant's default.
                if (isUprightTarget(entry.target)) item.paired =
                  variant !== part && !info?.paired ? pairedByDefault(variant, doc) :
                  !!getPartPlacementInfo(variant, doc)?.paired &&
                  data.get("paired") === "on";
                store.commit(next);
              } else
                store.commit(
                  replaceStructurePart(
                    doc,
                    physical.ownerId || physical.id,
                    variant,
                    params,
                  ),
                );
            })
          }
        >
          {part !== "upright" && (
            <Field label={entry ? "Variant" : "Frame member"}>
              <select name="variant" value={part} onChange={e => e.currentTarget.form?.requestSubmit()}>
                {variants.map((id) => (
                  <option value={id} key={id}>
                    {nameOf(id)}
                  </option>
                ))}
              </select>
              <ResetButton label="variant" changed={part !== resetVariant} onReset={() => store.act(() => { const next = structuredClone(doc); if (entry) { const a = next.accessories.find(a => a.id === entry.id)!; a.part = resetVariant; a.params = {}; store.commit(next); } else store.commit(replaceStructurePart(doc, ownerId!, resetVariant)); })} />
            </Field>
          )}
          {entry && isUprightTarget(entry.target) && (
            <>
              <Field label="Mounting upright">
                <select name="upright" value={entry.target.uprightId} onChange={e => e.currentTarget.form?.requestSubmit()}>
                  {Object.keys(doc.uprights)
                    .filter((id) => resolved.some((r) => r.id === id))
                    .map((id) => (
                      <option key={id} value={id}>
                        {id.replaceAll("-", " ")}
                      </option>
                    ))}
                </select>
                <ResetButton label="mounting upright" changed={entry.target.uprightId !== placementDefault!.target.uprightId} onReset={() => store.act(() => { const next = structuredClone(doc); next.accessories.find(a => a.id === entry.id)!.target.uprightId = placementDefault!.target.uprightId; store.commit(next); })} />
              </Field>
              {entry.spanTo && <Field label="Span end upright"><select name="spanTo" value={entry.spanTo} onChange={e => e.currentTarget.form?.requestSubmit()}>{Object.keys(doc.uprights).filter(id => !doc.removed.includes(id)).map(id => <option key={id}>{id}</option>)}</select></Field>}
              <Field label="Mounting face">
                <select
                  name="face"
                  value={entry.target.face}
                  onChange={e => e.currentTarget.form?.requestSubmit()}
                  disabled={spanning}
                >
                  {(spanning
                    ? [entry.target.face]
                    : info?.faces || ["front", "back", "left", "right"]
                  ).map((face) => (
                    <option key={face} value={face}>
                      {spanning ? "Inward connection" : face}
                    </option>
                  ))}
                </select>
                <ResetButton label="mounting face" disabled={spanning} changed={entry.target.face !== placementDefault!.target.face} onReset={() => store.act(() => { const next = structuredClone(doc); next.accessories.find(a => a.id === entry.id)!.target.face = placementDefault!.target.face; store.commit(next); })} />
              </Field>
              <Field label="Hole number">
                <NumericControl name="hole" label="Hole number" defaultValue={placementDefault!.target.hole + 1} value={entry.target.hole + 1} min={1} step={doc.rack.benchSpacing ? 0.5 : 1} normalize={value => doc.rack.benchSpacing ? Math.round(value * 2) / 2 : Math.round(value)}
                  max={Math.floor((doc.rack.height - doc.rack.firstHole) / doc.rack.pitch) + 1} disabled={fixedHole}
                  onGestureStart={store.beginGesture} onGestureEnd={store.endGesture}
                  onValue={value => store.act(() => {
                    const next = structuredClone(store.getSnapshot().doc);
                    next.accessories.find(a => a.id === entry.id)!.target.hole = value - 1;
                    store.commit(next);
                  })} />
              </Field>
              <Field label="Matching pair">
                <input
                  type="checkbox"
                  name="paired"
                  checked={!!info?.paired && entry.paired}
                  onChange={e => e.currentTarget.form?.requestSubmit()}
                  disabled={!info?.paired}
                />
                <ResetButton label="matching pair" disabled={!info?.paired} changed={entry.paired !== placementDefault!.paired} onReset={() => store.act(() => { const next = structuredClone(doc); next.accessories.find(a => a.id === entry.id)!.paired = placementDefault!.paired; store.commit(next); })} />
              </Field>
              <p className="note">
                {fixedHole
                  ? "Frame mount"
                  : `Mount height ${doc.rack.firstHole + entry.target.hole * doc.rack.pitch} mm`}
              </p>
            </>
          )}
          {entry && <div className="rotation-controls">
            <p className="note">{rotationMode(doc, entry.id).reason}</p>
            {rotationMode(doc, entry.id).supported && <button type="button" onClick={() => store.rotateMounted(selected ?? entry.id)}>{rotationMode(doc, entry.id).label} · R / scroll</button>}
          </div>}
          {entry && <VendorControls store={store} entry={entry} />}
          {entry && <RackPartControls store={store} entry={entry} />}
          {entry && <PlateStackEditor key={entry.id} store={store} entry={entry} />}
          <VendorCredit part={part} />
          {fields.map((field) => (
            <Field key={field.key} label={`${field.label} (mm)`}>
              <NumericControl defaultValue={partDefaults(doc, part)[field.key]} standardOptions={definitions.find(d => d.id === part)?.standardOptions?.[field.key]} name={field.key} label={field.label}
                value={entry?.params[field.key] ?? (ownerId ? doc.structure[ownerId]?.params[field.key] : undefined) ?? physical.params[field.key] ?? definitions.find(d => d.id === part)?.defaults[field.key] ?? 0}
                min={field.min} max={field.max} step={field.step}
                onGestureStart={store.beginGesture} onGestureEnd={store.endGesture}
                onValue={value => store.act(() => {
                  const next = structuredClone(store.getSnapshot().doc);
                  if (entry) { next.accessories.find(a => a.id === entry.id)!.params[field.key] = value; store.commit(next); }
                  else store.commit(replaceStructurePart(next, physical.ownerId || physical.id, part, { ...next.structure[physical.ownerId || physical.id]?.params, [field.key]: value }));
                })} />
            </Field>
          ))}
          <button type="button" onClick={() => store.act(() => { store.endGesture(); store.edit(current => resetPart(current, physical.id)); })}>Reset this part</button>
          {part !== "upright" && (
            <button className="primary">
              {entry ? "Apply placement" : "Replace frame member"}
            </button>
          )}
          {entry && (
            <button
              type="button"
              onClick={() => store.startPlacement(entry.part, entry.id)}
            >
              Move in 3D ↗
            </button>
          )}
          {entry?.paired && (
            <button
              type="button"
              onClick={() =>
                store.act(() => store.commit(unpairAccessory(doc, entry.id)))
              }
            >
              Edit sides independently
            </button>
          )}
          <button
            className="danger"
            type="button"
            onClick={() =>
              store.act(() => {
                store.commit(removeInstance(doc, ownerId!));
                store.select(null);
              })
            }
          >
            Remove part
          </button>
        </form>
      </div>
    </>
  );
}
// Each region below subscribes to the store slices it shows, so a drag or pointer move that only moves a part does not
// re-render the catalog, toolbar or timeline. Keep new store reads inside the smallest component that needs them.
function HistoryButtons({ store }: { store: BuilderStore }) {
  const { canUndo, canRedo } = useStoreSelector(store, s => ({ canUndo: s.canUndo, canRedo: s.canRedo }), shallowEqual);
  return (
    <div className="history-actions">
      <button
        id="undo"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => store.history("undo")}
      >
        ↶
      </button>
      <button
        id="redo"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => store.history("redo")}
      >
        ↷
      </button>
    </div>
  );
}
function ExportControl({ store, controller }: { store: BuilderStore; controller: RefObject<ReturnType<typeof createBuilderScene> | null> }) {
  const { loading, empty } = useStoreSelector(store, s => ({ loading: s.loading, empty: !s.resolved.length }), shallowEqual);
  return <ExportMenu store={store} loading={loading} empty={empty}
    exportGLB={() => {
      if (!controller.current) return Promise.reject(new Error('Rack scene is not ready.'));
      return controller.current.exportGLB();
    }} />;
}
function PairControl({ store }: { store: BuilderStore }) {
  // Unpairable parts show unchecked, not a disabled "pair on".
  const { paired, unpairable } = useStoreSelector(store, s => ({
    paired: s.paired,
    unpairable: !!s.placing && !getPartPlacementInfo(s.placing.part, s.doc)?.paired && !(floorPart(s.placing.part)?.pair && !s.placing.movingId),
  }), shallowEqual);
  return (
    <label className="pair-control">
      <input
        id="paired"
        type="checkbox"
        checked={paired && !unpairable}
        disabled={unpairable}
        onChange={(e) => store.patch({ paired: e.target.checked })}
      />
      <span>
        Add matching pair
      </span>
    </label>
  );
}
/** The compact parts sidebar (#183): the gallery launcher, pairing, favourites and recent parts, rack starters and
 * category shortcuts. The full catalog lives in the parts gallery (components/PartGallery). */
const CatalogPanel = memo(function CatalogPanel({ store }: { store: BuilderStore }) {
  return (
    <aside className="catalog-panel">
      <div className="panel-heading">
        <h1>Parts</h1>

      </div>
      <GalleryLauncher />
      <PairControl store={store} />
      <div id="catalog">
        <SystemPlacementOptions store={store} />
        <CompactCatalog store={store} />
        <RackPresets store={store} />
        <BrowseCategories />
      </div>
      <div className="catalog-footer">
        <Link to="/library">Browse parts library ↗</Link>
        <Link to="/gyms">Pre-built gym gallery ↗</Link>
        <Link to="/parts/$partId" params={{ partId: "upright" }}>Part detail viewer ↗</Link>
      </div>
    </aside>
  );
});
function SelectToolButton({ store }: { store: BuilderStore }) {
  const selectionTool = useStoreSelector(store, s => s.selectionTool);
  return <button aria-pressed={selectionTool} onClick={() => store.patch({ selectionTool: !selectionTool })}>Select</button>;
}
function StageCaption({ store }: { store: BuilderStore }) {
  const { viewing, dimensions } = useStoreSelector(store, s => ({ viewing: s.timeline.viewing, dimensions: s.dimensions }), shallowEqual);
  return (
    <div className="stage-caption">
      <span className="eyebrow">{viewing ? "Viewing history · edits apply to latest" : "Your rack"}</span>
      <div id="dimensions">{dimensions}</div>
    </div>
  );
}
function PartsCount({ store }: { store: BuilderStore }) {
  return <>{useStoreSelector(store, s => s.resolved.length)}</>;
}
function PlacementHint({ store }: { store: BuilderStore }) {
  const nameOf = usePartNames(store).name;
  const hint = useStoreSelector(store, s => (s.placing || s.structureChoice || s.systemChoice) ? {
    placingPart: s.placing?.part ?? null, structureChoice: s.structureChoice, placementText: s.placementText,
    hasProposal: !!s.proposal, rotationOnly: !!s.placing?.rotationOnly, addMode: !!s.structureChoice && s.structureMode === "add",
    movePair: !!s.placing?.movingId && !!getPartPlacementInfo(s.placing.part, s.doc)?.paired, paired: s.paired,
  } : null, shallowEqual);
  if (!hint) return null;
  return (
    <div className="placement-hint" id="placement-hint">
      <span id="placement-text">
        {hint.placementText ||
          `Place ${nameOf(hint.placingPart ?? hint.structureChoice!)}`}
      </span>
      {!hint.addMode && <button id="accept-placement" disabled={!hint.hasProposal} onClick={store.acceptProposal}>{hint.rotationOnly ? "Apply rotation" : "Place"}</button>}
      {hint.movePair && <label><input type="checkbox" checked={hint.paired} onChange={e => store.patch({ paired: e.target.checked })} /> Move pair together</label>}
      <button id="cancel-placement" onClick={store.cancelPlacement}>
        Cancel <kbd>ESC</kbd>
      </button>
    </div>
  );
}
function PartsDrawer({ store, close }: { store: BuilderStore; close: () => void }) {
  const nameOf = usePartNames(store).name;
  const { resolved, selection } = useStoreSelector(store, s => ({ resolved: s.resolved, selection: s.selection }), shallowEqual);
  return (
    <section className="parts-drawer" id="parts-drawer">
      <div className="drawer-heading">
        <h2>Parts list</h2>
        <button onClick={close}>Close ×</button>
      </div>
      <div id="parts-list">
        {resolved.map(row => (
          <button key={row.id} className="bom-row" data-instance-id={row.id}
            aria-pressed={selection.includes(row.id)}
            onClick={e => store.select(row.id, e, resolved.map(r => r.id))}>
            {nameOf(row.part)} · {row.id.replaceAll('-', ' ')}
            <VendorCredit part={row.part} compact />
          </button>
        ))}
      </div>
    </section>
  );
}
function SelectionCount({ store }: { store: BuilderStore }) {
  const count = useStoreSelector(store, s => s.selection.length);
  return count > 1 ? <h2 id="selection-title">{count} parts</h2> : null;
}
function SwapAccessory({ store }: { store: BuilderStore }) {
  const swap = useStoreSelector(store, s => s.placing && !s.placing.movingId ? { part: s.placing.part, doc: s.doc } : null, shallowEqual);
  if (!swap) return null;
  return <details><summary>Swap an existing accessory</summary>
    {swap.doc.accessories.map(a => {
      const candidate = swapCandidate(swap.doc, a.id, swap.part);
      return candidate.valid ? <button key={a.id} onClick={() => store.act(() => { store.commit(candidate.doc); store.select(candidate.ownerId); })}>Swap {a.id}</button> : null;
    })}
  </details>;
}
function InspectorSlot({ store }: { store: BuilderStore }) {
  return <Inspector key={useStoreSelector(store, s => s.inputRevision)} store={store} />;
}
function Warnings({ store }: { store: BuilderStore }) {
  const { doc, resolved } = useStoreSelector(store, s => ({ doc: s.doc, resolved: s.resolved }), shallowEqual);
  const warnings = useMemo(() => [...detectCollisions(resolved), ...floorWarnings(doc), ...wallWarnings(doc), ...hangWarnings(doc)], [doc, resolved]);
  return (
    <div id="warnings">
      {warnings.map((warning, i) => (
        <button
          key={i}
          className="warning-item"
          onClick={() => store.select(warning.ids[0])}
        >
          △ {warning.message}
        </button>
      ))}
    </div>
  );
}
/** Timeline changes only on commits and navigation; entries are compared by content since snapshots are rebuilt. */
function sameTimeline(a: BuilderSnapshot["timeline"], b: BuilderSnapshot["timeline"]) {
  return a === b || a.position === b.position && a.latest === b.latest && a.applied === b.applied && a.viewing === b.viewing &&
    a.entries.length === b.entries.length && a.entries.every((e, i) => { const f = b.entries[i]; return e === f || e.id === f.id && e.label === f.label && e.category === f.category; });
}
function TimelineBar({ store, controller }: { store: BuilderStore; controller: RefObject<ReturnType<typeof createBuilderScene> | null> }) {
  const [building, setBuilding] = useState(false);
  const timeline = useStoreSelector(store, s => s.timeline, sameTimeline);
  const { loading, busy } = useStoreSelector(store, s => ({ loading: s.loading, busy: !!s.placing || !!s.structureChoice || !!s.systemChoice }), shallowEqual);
  return <HistoryTimeline timeline={timeline} loading={loading}
    seek={store.seekHistory} restore={() => store.restoreHistory()} clear={store.clearHistory}
    build={{ playing: building, disabled: loading || busy,
      toggle: () => building ? controller.current?.stopBuild() : setBuilding(!!controller.current?.playBuild(() => setBuilding(false))) }} />;
}
function StatusBar({ store }: { store: BuilderStore }) {
  const { status, error } = useStoreSelector(store, s => ({ status: s.status, error: s.error }), shallowEqual);
  return (
    <footer className="status-bar">
      <span
        id="status"
        role="status"
        className={error ? "error" : ""}
      >
        {status}
      </span>
    </footer>
  );
}
export default function BuilderPage() {
  const [store] = useState(getBuilderStore);
  const viewport = useRef<HTMLDivElement>(null),
    controller = useRef<ReturnType<typeof createBuilderScene> | null>(null),
    importFile = useRef<HTMLInputElement>(null);
  useOpenGym(store, () => controller.current?.refitOnNextBuild());
  const [drawer, setDrawer] = useState(false),
    [view, setView] = useState<"iso" | "front" | "side" | "top">("iso");
  useEffect(() => {
    const scene = createBuilderScene(viewport.current!, store);
    controller.current = scene;
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") store.escape();
      if (
        e.target instanceof HTMLElement &&
        (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable)
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        store.history(e.shiftKey ? "redo" : "undo");
      }
      if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const timeline = store.getSnapshot().timeline;
        const step = historyKeyStep(e.key, timeline.position, timeline.latest);
        if (step !== undefined) { e.preventDefault(); store.seekHistory(step); }
      }
      const selected = store.getSnapshot().selected;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        store.act(() => {
          store.removeSelected();
        });
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      scene.dispose();
      controller.current = null;
    };
  }, [store]);
  const fit = (mode = view) => {
    setView(mode);
    controller.current?.fit(mode);
  };
  return (
    <div className="builder-page">
      <div className="builder-shell">
        <header className="toolbar">
          <Link className="brand" to="/">
            BOS STRENGTH<small>RACK BUILDER</small>
          </Link>
          <div className="project-heading">
            <span className="live-dot" /> YOUR WORKSPACE
          </div>
          <div className="toolbar-actions">
            <Link className="gyms-link" to="/gyms">Gym gallery</Link>
            <ConfigManager store={store} />
            <HistoryButtons store={store} />
            <button id="load" onClick={() => importFile.current?.click()}>
              Load JSON
            </button>
            <button
              id="save"
              onClick={() =>
                download(
                  new Blob([store.exportJSON()], {
                    type: "application/json",
                  }),
                  "bos-strength-rack.json",
                )
              }
            >
              Save JSON
            </button>
            <ExportControl store={store} controller={controller} />
            <input
              hidden
              ref={importFile}
              id="import-file"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const input = e.currentTarget,
                  file = input.files?.[0];
                if (!file) return;
                try {
                  store.importJSON(await file.text());
                } catch (error) {
                  store.status(
                    `Could not load design: ${error instanceof Error ? error.message : String(error)}`,
                    true,
                  );
                } finally {
                  input.value = "";
                }
              }}
            />
          </div>
        </header>
        <CatalogPanel store={store} />
        <main className="stage">
          <div id="viewport" ref={viewport} />
          <div className="view-controls">
            <SelectToolButton store={store} />
            {(["iso", "front", "side", "top"] as const).map((mode) => (
              <button
                key={mode}
                data-view={mode}
                aria-pressed={view === mode}
                onClick={() => fit(mode)}
              >
                {mode === "iso" ? "3D" : mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <StageCaption store={store} />
          <div className="stage-actions">
            <button id="fit" onClick={() => fit()}>
              Fit view
            </button>
            <button
              id="parts-toggle"
              aria-expanded={drawer}
              onClick={() => setDrawer(!drawer)}
            >
              Parts list (<PartsCount store={store} />)
            </button>
          </div>
          <PlacementHint store={store} />
          {drawer && <PartsDrawer store={store} close={() => setDrawer(false)} />}
        </main>
        <aside className="inspector-panel">
          <div className="inspector-topline">
            <span className="eyebrow">DETAILS & PLACEMENT</span>
            <span className="unit-badge">MM / IN</span>
          </div>
          <button
            id="deselect"
            className="back-button"
            onClick={() => store.select(null)}
          >
            ← Rack settings
          </button>
          <SelectionCount store={store} />
          <AppearanceControls store={store} />
          <CableSmithControls store={store} />
          <LogoControls store={store} />
          <SwapAccessory store={store} />
          <InspectorSlot store={store} />
          <Warnings store={store} />
          <div className="inspector-bottom">
            <button
              id="reset-design"
              className="new-rack-button"
              onClick={() => {
                if (window.confirm('Reset entire rack to the stock BOS starting assembly? All dimensions, parts and appearance will reset. You can Undo this change.')) {
                  store.endGesture(); store.commit(createAssembly(), { category: "preset", label: "Reset entire rack", replacement: true }); store.select(null);
                  controller.current?.refitOnNextBuild();
                }
              }}
            >
              Reset entire rack
            </button>
          </div>
        </aside>
        <TimelineBar store={store} controller={controller} />
        <StatusBar store={store} />
      </div>
      <PartGallery store={store} />
    </div>
  );
}
