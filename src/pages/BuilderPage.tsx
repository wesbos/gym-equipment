import { editableFields } from '../state/selection.ts';
import { BulkInspector } from '../components/BulkInspector.tsx';
import { gridProfile } from '../../rack-generator/profiles.ts';
import { RackPresets } from '../components/RackPresets.tsx';
import { TopologyEditor } from '../components/TopologyEditor.tsx';
import { structureSlots } from '../../rack-generator/topology.ts';
import { snapDimensions, stepDimension } from '../../rack-generator/grid.ts';
import { NumericControl } from "../components/NumericControl.tsx";
import { ConfigManager } from "../components/ConfigManager.tsx";
import { PartThumbnail } from "../components/PartThumbnail.tsx";
import { AppearanceControls } from "../components/AppearanceControls.tsx";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import { getBuilderStore, type BuilderStore } from "../state/builder-store.ts";
import { createBuilderScene } from "../scenes/builder-scene.ts";
import {
  getPartPlacementInfo,
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
const groups: [string, PartId[]][] = [
  [
    "Frame",
    [
      "upright",
      "crossmember-425",
      "crossmember-725",
      "crossmember-1075",
      "angled-crossmember",
      "offset-crossmember",
    ],
  ],
  [
    "Bracing & nameplates",
    [
      "branded-crossmember",
      "branded-crossmember-lite",
      "nameplate",
      "foot-400",
      "foot-800",
    ],
  ],
  ["Pull-up bars", ["pullup-straight", "pullup-multigrip", "pullup-sphere"]],
  [
    "J-hooks & monolifts",
    ["j-hook-standard", "j-hook-roller", "j-hook-sandwich", "monolift"],
  ],
  [
    "Safeties",
    ["safety-box", "safety-pin-pipe", "safety-webbing", "spotter-arm"],
  ],
  ["Training attachments", ["dip-horn", "dip-bar-adjustable", "landmine"]],
  ["Storage", ["single-bar-holder", "storage-pin-short", "storage-pin-long"]],
];
const allParts = groups.flatMap(([, ids]) => ids);
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
function Inspector({ store }: { store: BuilderStore }) {
  const [snapHint, setSnapHint] = useState("");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot),
    { doc, resolved, selected, structureChoice, definitions } = state;
  const nameOf = (part: string) =>
    definitions
      .find((d) => d.id === part)
      ?.name.replace(/^BOS STRENGTH\s*/, "") || part;
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
    const available = getAvailableStructure(doc),
      placement = getPartPlacementInfo(structureChoice, doc);
    const slots =
      structureChoice === "upright"
        ? available.filter((r) => r.part === "upright")
        : structureSlots(doc).filter(
            (s) =>
              placement?.slots?.includes(s.id) &&
              (resolved.some((r) => r.ownerId === s.id) ||
                available.some((r) => r.id === s.id)),
          );
    return (
      <>
        <h2 id="selection-title">{nameOf(structureChoice)}</h2>
        <div id="inspector" className="inspector-fields">
          <p>
            Choose the frame connection. Its span follows the rack dimensions.
          </p>
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() =>
                store.act(() => {
                  store.commit(
                    structureChoice === "upright"
                      ? restoreInstance(doc, slot.id)
                      : replaceStructurePart(doc, slot.id, structureChoice),
                  );
                  store.select(slot.id);
                })
              }
            >
              {resolved.some((r) => r.ownerId === slot.id) ? "Replace" : "Add"}{" "}
              {slot.id.replaceAll("-", " ")}
            </button>
          ))}
          {!slots.length && (
            <p>
              {structureChoice === "upright"
                ? "Use Uprights & connections to extend the rack."
                : "Restore the supporting uprights to use this member."}
            </p>
          )}
        </div>
      </>
    );
  }
  if (state.selection.length > 1) return <BulkInspector store={store} />;
  if (!part || !physical)
    return (
      <>
        <h2 id="selection-title">Rack settings</h2>
        <RackPresets store={store} />
        {gridProfile(doc.profileId).reconstructionNote && <p className="note">{gridProfile(doc.profileId).label}: {gridProfile(doc.profileId).reconstructionNote}</p>}
        <TopologyEditor key={JSON.stringify(doc)} doc={doc} store={store} selected={ownerId} />
        <p className="settings-intro">
          Build your frame, then add parts at highlighted connections.
        </p>
        <form id="frame-form" onSubmit={e => { e.preventDefault(); store.endGesture(); }}>
          {(['height', 'width', 'depth'] as const).map(key => {
            const factor = key === 'height' ? 25.4 : 1;
            const label = key === 'height' ? 'Upright height' : `Clear rack ${key}`;
            return <Field key={key} label={label}><div className="input-wrap">
              <NumericControl name={key === 'height' ? 'heightIn' : key} label={label}
                value={doc.rack[key] / factor} min={key === 'height' ? 40 : key === 'width' ? 400 : 300}
                max={key === 'height' ? 157 : key === 'width' ? 2000 : 1500} step={doc.rack.pitch / factor}
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
              <span>{key === 'height' ? 'in' : 'mm'}</span>
            </div></Field>;
          })}
          <output aria-live="polite">{snapHint || `Grid: ${doc.rack.pitch} mm · depths ${gridProfile(doc.profileId).depths.join(' / ')} mm`}</output>
        </form>
      </>
    );
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
  const spanning = part.startsWith("safety") || part.startsWith("pullup");
  const fixedHole =
    info?.fixedHole !== undefined ||
    part === "pullup-multigrip" ||
    part === "pullup-sphere";
  return (
    <>
      <h2 id="selection-title">{nameOf(part)}</h2>
      <TopologyEditor key={JSON.stringify(doc)} doc={doc} store={store} selected={ownerId} />
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
                item.target = {
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
                item.paired =
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
            </Field>
          )}
          {entry && (
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
              </Field>
              <Field label="Hole number">
                <NumericControl name="hole" label="Hole number" value={entry.target.hole + 1} min={1} step={doc.rack.benchSpacing ? 0.5 : 1} normalize={value => doc.rack.benchSpacing ? Math.round(value * 2) / 2 : Math.round(value)}
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
                  checked={entry.paired}
                  onChange={e => e.currentTarget.form?.requestSubmit()}
                  disabled={!info?.paired}
                />
              </Field>
              <p className="note">
                {fixedHole
                  ? "Mount follows the frame."
                  : `Mount height ${doc.rack.firstHole + entry.target.hole * doc.rack.pitch} mm`}
              </p>
            </>
          )}
          {fields.map((field) => (
            <Field key={field.key} label={`${field.label} (mm)`}>
              <NumericControl name={field.key} label={field.label}
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
          {!entry && (
            <p className="note">
              Connected frame member. Change rack dimensions to resize the
              frame. Removing an upright also removes attached accessories.
            </p>
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
export default function BuilderPage() {
  const [store] = useState(getBuilderStore);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const viewport = useRef<HTMLDivElement>(null),
    controller = useRef<ReturnType<typeof createBuilderScene> | null>(null),
    importFile = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(""),
    [drawer, setDrawer] = useState(false),
    [view, setView] = useState<"iso" | "front" | "side" | "top">("iso");
  const nameOf = (part: string) =>
    state.definitions
      .find((d) => d.id === part)
      ?.name.replace(/^BOS STRENGTH\s*/, "") || part;
  useEffect(() => {
    const scene = createBuilderScene(viewport.current!, store);
    controller.current = scene;
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") store.escape();
      if (
        e.target instanceof HTMLElement &&
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        store.history(e.shiftKey ? "redo" : "undo");
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
  const warnings = detectCollisions(state.resolved);
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
            <ConfigManager store={store} />
            <div className="history-actions">
              <button
                id="undo"
                aria-label="Undo"
                disabled={!state.canUndo}
                onClick={() => store.history("undo")}
              >
                ↶
              </button>
              <button
                id="redo"
                aria-label="Redo"
                disabled={!state.canRedo}
                onClick={() => store.history("redo")}
              >
                ↷
              </button>
            </div>
            <button id="load" onClick={() => importFile.current?.click()}>
              Load JSON
            </button>
            <button
              id="save"
              onClick={() =>
                download(
                  new Blob([JSON.stringify(state.doc, null, 2)], {
                    type: "application/json",
                  }),
                  "bos-strength-rack.json",
                )
              }
            >
              Save JSON
            </button>
            <button
              id="export"
              className="primary"
              disabled={state.loading || !state.resolved.length}
              onClick={async () => {
                try {
                  const data = await controller.current?.exportGLB();
                  if (data) {
                    download(
                      new Blob([data], { type: "model/gltf-binary" }),
                      "bos-strength-rack.glb",
                    );
                    store.status("Rack exported as GLB.");
                  }
                } catch (error) {
                  store.status(
                    `Export failed: ${error instanceof Error ? error.message : String(error)}`,
                    true,
                  );
                }
              }}
            >
              Export GLB ↗
            </button>
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
                  if (file.size > 2_000_000)
                    throw new Error("Design file is too large.");
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
        <aside className="catalog-panel">
          <div className="panel-heading">
            <span className="eyebrow">MAKE IT YOURS</span>
            <h1>Build your rack.</h1>
            <p>Select a part, then choose a connection.</p>
          </div>
          <div className="search-wrap">
            <input
              id="search"
              aria-label="Search parts"
              placeholder="Search parts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="pair-control">
            <input
              id="paired"
              type="checkbox"
              checked={state.paired}
              disabled={
                !!state.placing &&
                !getPartPlacementInfo(state.placing.part, state.doc)?.paired
              }
              onChange={(e) => store.patch({ paired: e.target.checked })}
            />
            <span>
              Add matching pair<small>Place both sides together</small>
            </span>
          </label>
          <div id="catalog">
            {groups.map(([label, ids]) => {
              const matches = ids.filter((id) =>
                nameOf(id).toLowerCase().includes(search.toLowerCase()),
              );
              return matches.length ? (
                <section key={label}>
                  <h3>{label}</h3>
                  {matches.map((id) => (
                    <button
                      className="part-card"
                      key={id}
                      data-part={id}
                      aria-pressed={
                        state.placing?.part === id ||
                        state.structureChoice === id
                      }
                      draggable={
                        id !== "upright" &&
                        !getPartPlacementInfo(id, state.doc)?.slots?.length
                      }
                      onClick={() => store.startPlacement(id)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", id);
                        e.dataTransfer.effectAllowed = "copy";
                        store.startPlacement(id);
                      }}
                    >
                      <PartThumbnail
                        enabled={state.definitions.length > 0}
                        part={id}
                        params={state.definitions.find((d) => d.id === id)?.defaults}
                        className="thumb"
                      />
                      <span>{nameOf(id)}</span>
                      <span className="part-plus">+</span>
                    </button>
                  ))}
                </section>
              ) : null;
            })}
          </div>
          <div className="catalog-footer">
            <Link to="/library">Browse parts library ↗</Link>
            <Link to="/parts">Part detail viewer ↗</Link>
          </div>
        </aside>
        <main className="stage">
          <div id="viewport" ref={viewport} />
          <div className="view-controls">
            <button aria-pressed={state.selectionTool} onClick={() => store.patch({ selectionTool: !state.selectionTool })}>Select</button>
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
          <div className="stage-caption">
            <span className="eyebrow">YOUR BOS STRENGTH RACK</span>
            <div id="dimensions">{state.dimensions}</div>
          </div>
          <div className="stage-actions">
            <button id="fit" onClick={() => fit()}>
              Fit view
            </button>
            <button
              id="parts-toggle"
              aria-expanded={drawer}
              onClick={() => setDrawer(!drawer)}
            >
              Parts list ({state.resolved.length})
            </button>
          </div>
          {state.placing && (
            <div className="placement-hint" id="placement-hint">
              <span id="placement-text">
                {state.placementText ||
                  `Place ${nameOf(state.placing.part)} · choose a highlighted connection`}
              </span>
              <button id="cancel-placement" onClick={store.cancelPlacement}>
                Cancel <kbd>ESC</kbd>
              </button>
            </div>
          )}
          {drawer && (
            <section className="parts-drawer" id="parts-drawer">
              <div className="drawer-heading">
                <h2>Parts list</h2>
                <button onClick={() => setDrawer(false)}>Close ×</button>
              </div>
              <div id="parts-list">
                {state.resolved.map(row => (
                  <button key={row.id} className="bom-row" data-instance-id={row.id}
                    aria-pressed={state.selection.includes(row.id)}
                    onClick={e => store.select(row.id, e, state.resolved.map(r => r.id))}>
                    {nameOf(row.part)} · {row.id.replaceAll('-', ' ')}
                  </button>
                ))}
              </div>
            </section>
          )}
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
          {state.selection.length > 1 && <h2 id="selection-title">{state.selection.length} parts</h2>}
          <AppearanceControls store={store} />
          <Inspector key={state.inputRevision} store={store} />
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
          <div className="inspector-bottom">
            <div className="help-card">
              <p>
                Click a part on your rack to adjust its position and dimensions.
              </p>
            </div>
            <button
              id="reset-design"
              className="new-rack-button"
              onClick={() => {
                controller.current?.refitOnNextBuild();
                store.newRack();
              }}
            >
              New rack +
            </button>
          </div>
        </aside>
        <footer className="status-bar">
          <span
            id="status"
            role="status"
            className={state.error ? "error" : ""}
          >
            {state.status}
          </span>
          <span className="navigation-help">
            DRAG TO ORBIT · SCROLL TO ZOOM · RIGHT-DRAG TO PAN
          </span>
          <span>BOS / STRENGTH</span>
        </footer>
      </div>
    </div>
  );
}
