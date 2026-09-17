import type { PartScene, View } from "../scenes/part-scene";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createPartScene, download } from "../scenes/part-scene";
import "../../rack-generator/style.css";
import "../../rack-generator/library.css";
import type {
  CatalogDefinition,
  LibraryWorkerResponse,
} from "../../rack-generator/worker-types.ts";
type Definition = CatalogDefinition & { note?: string };
const labelOf = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export default function PartsPage() {
  const viewport = useRef<HTMLDivElement>(null),
    scene = useRef<PartScene | null>(null),
    worker = useRef<Worker | null>(null),
    sequence = useRef(0);
  const definitionsRef = useRef<Definition[]>([]),
    selectedRef = useRef<Definition | null>(null),
    values = useRef(new Map<string, Record<string, number>>());
  const compareRef = useRef({ enabled: false, overlay: false });
  const [definitions, setDefinitions] = useState<Definition[]>([]),
    [selected, setSelected] = useState<Definition | null>(null),
    [params, setParams] = useState<Record<string, number>>({});
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("Initializing geometry…"),
    [error, setError] = useState(false),
    [valid, setValid] = useState(false),
    [description, setDescription] = useState("");
  const [view, setView] = useState<View>("iso"),
    [reference, setReference] = useState(false),
    [overlay, setOverlay] = useState(false),
    [wireframe, setWireframe] = useState(false);
  const currentParams = useRef<Record<string, number>>({});
  function build(def: Definition, next: Record<string, number>) {
    values.current.set(def.id, next);
    setValid(false);
    setError(false);
    setStatus("Building " + def.name + "…");
    worker.current?.postMessage({
      id: ++sequence.current,
      brand: "BOS STRENGTH",
      part: def.id,
      params: next,
    });
  }
  function select(def: Definition, reset = false) {
    const next = reset
      ? { ...def.defaults }
      : values.current.get(def.id) || { ...def.defaults };
    selectedRef.current = def;
    setSelected(def);
    setParams(next);
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#${def.id}`
    );
    build(def, next);
  }
  useEffect(() => {
    if (!viewport.current) return;
    let active = true;
    const controller = createPartScene(viewport.current, (message) => {
      setError(true);
      setStatus(message);
    });
    scene.current = controller;
    const geometryWorker = new Worker(
      new URL("../../rack-generator/library-worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.current = geometryWorker;
    geometryWorker.onerror = (e) => {
      if (active) {
        setError(true);
        setStatus(e.message || "Could not initialize geometry engine.");
        setValid(false);
      }
    };
    geometryWorker.onmessage = ({
      data,
    }: MessageEvent<LibraryWorkerResponse>) => {
      if (!active) return;
      if (data.type === "catalog") {
        definitionsRef.current = data.definitions;
        setDefinitions(data.definitions);
        const def =
          data.definitions.find((d) => d.id === location.hash.slice(1)) ||
          data.definitions[0];
        if (def) select(def);
        return;
      }
      if (data.id !== sequence.current) return;
      if (data.type === "error") {
        setError(true);
        setStatus(data.error);
        setValid(false);
        return;
      }
      const size = controller.setMeshes(data.meshes);
      currentParams.current = data.params;
      setDescription(
        size.map(Math.round).join(" × ") + " mm · Manifold reconstruction"
      );
      setStatus(
        `${data.meshes.length} solids · ${data.meshes
          .reduce((n, m) => n + m.indices.length / 3, 0)
          .toLocaleString()} triangles`
      );
      setError(false);
      setValid(true);
      void controller.compare(
        selectedRef.current?.reference,
        compareRef.current.enabled,
        compareRef.current.overlay
      );
    };
    const hash = () => {
      const def = definitionsRef.current.find(
        (d) => d.id === location.hash.slice(1)
      );
      if (def && def.id !== selectedRef.current?.id) select(def);
    };
    window.addEventListener("hashchange", hash);
    return () => {
      active = false;
      ++sequence.current;
      window.removeEventListener("hashchange", hash);
      geometryWorker.onmessage = null;
      geometryWorker.onerror = null;
      geometryWorker.terminate();
      worker.current = null;
      controller.dispose();
      scene.current = null;
    };
  }, []);
  function changeCompare(enabled: boolean, overlayValue: boolean) {
    setReference(enabled);
    setOverlay(overlayValue);
    compareRef.current = { enabled, overlay: overlayValue };
    void scene.current?.compare(selected?.reference, enabled, overlayValue);
  }
  function changeParam(key: string, value: number) {
    setParams((p) => ({ ...p, [key]: value }));
    ++sequence.current;
    setValid(false);
    setError(false);
    setStatus("Parameters changed · rebuild to apply");
  }
  const categories = [...new Set(definitions.map((d) => d.category))];
  return (
    <div className="parts-page">
      <aside>
        <div className="eyebrow">
          BOS STRENGTH <span>02 / PARTS</span>
        </div>
        <h1>Every piece.</h1>
        <p className="intro">
          A library of editable Manifold reconstructions.
          <br />
          <Link to="/">← Original upright builder</Link>
        </p>
        <Link className="source-link" to="/builder">
          Build a complete rack ↗
        </Link>
        <input
          id="search"
          type="search"
          placeholder="Find a part…"
          aria-label="Find a part"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <nav id="catalog" aria-label="Parts library">
          {categories.map((category) => {
            const entries = definitions.filter(
              (d) =>
                d.category === category &&
                d.name.toLowerCase().includes(search.toLowerCase())
            );
            return entries.length ? (
              <div key={category}>
                <h3>{category}</h3>
                {entries.map((d) => (
                  <button
                    key={d.id}
                    className={selected?.id === d.id ? "active" : ""}
                    onClick={() => select(d)}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            ) : null;
          })}
        </nav>
      </aside>
      <main>
        <header>
          <div>
            <span className="live-dot" /> PARTS STUDY{" "}
            <span className="muted">/ MANIFOLD CAD</span>
          </div>
          <div>
            <button
              id="save"
              disabled={!valid}
              onClick={() => {
                if (selected)
                  download(
                    new Blob(
                      [
                        JSON.stringify(
                          {
                            brand: "BOS STRENGTH",
                            part: selected.id,
                            params: currentParams.current,
                            units: "mm",
                            approximate: true,
                          },
                          null,
                          2
                        ),
                      ],
                      { type: "application/json" }
                    ),
                    "bos-strength-" + selected.id + ".json"
                  );
              }}
            >
              Save parameters ↓
            </button>
            <button
              id="export"
              disabled={!valid}
              onClick={() => {
                if (selected)
                  void scene.current
                    ?.exportGLB("bos-strength-" + selected.id)
                    .catch((e) => {
                      setError(true);
                      setStatus(String(e));
                    });
              }}
            >
              Export GLB ↓
            </button>
          </div>
        </header>
        <div id="viewport" ref={viewport} aria-label="Interactive part viewer">
          <div className="view-tools">
            {(["iso", "front", "top", "side"] as const).map((v) => (
              <button
                key={v}
                data-view={v}
                className={view === v ? "selected" : ""}
                onClick={() => {
                  setView(v);
                  scene.current?.fit(v);
                }}
              >
                {v === "iso" ? "Perspective" : labelOf(v)}
              </button>
            ))}
          </div>
          <div className="display-tools">
            <label>
              <input
                id="reference"
                type="checkbox"
                checked={reference}
                disabled={!selected?.reference}
                onChange={(e) => changeCompare(e.target.checked, overlay)}
              />{" "}
              Compare source
            </label>
            <label>
              <input
                id="overlay"
                type="checkbox"
                checked={overlay}
                disabled={!selected?.reference}
                onChange={(e) =>
                  changeCompare(e.target.checked || reference, e.target.checked)
                }
              />{" "}
              Overlay
            </label>
            <label>
              <input
                id="wireframe"
                type="checkbox"
                checked={wireframe}
                onChange={(e) => {
                  setWireframe(e.target.checked);
                  scene.current?.setWireframe(e.target.checked);
                }}
              />{" "}
              Wireframe
            </label>
            <button id="fit" onClick={() => scene.current?.fit()}>
              Fit view ⤢
            </button>
          </div>
          <div id="compare-label" hidden={!reference || !selected?.reference}>
            {overlay
              ? "AMBER OVERLAY / ORIGINAL SOURCE"
              : "MANIFOLD REBUILD ←    → SOURCE MESH"}
          </div>
        </div>
        <div className="model-caption">
          <h2 id="model-title">{selected?.name || "Loading parts…"}</h2>
          <p id="model-description">{description}</p>
        </div>
        <footer>
          <span id="status" className={error ? "error" : ""} role="status">
            {status}
          </span>
          <span>DRAG TO ORBIT · SCROLL TO ZOOM · RIGHT-DRAG TO PAN</span>
        </footer>
      </main>
      <section id="editor">
        <div className="section-title">
          03 <span>Part parameters</span>
          <small>MILLIMETRES / DEGREES</small>
        </div>
        <p id="part-note" className="note">
          {selected?.description ||
            selected?.note ||
            "Rebuilt from reference components. Edit the dimensions to generate a new part."}
        </p>
        <form
          id="parameters"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) build(selected, params);
          }}
        >
          <div id="fields" className="fields">
            {Object.entries(params).map(([key, value]) => (
              <label key={key}>
                {labelOf(key)}
                <div className="input-wrap">
                  <input
                    name={key}
                    type="number"
                    step="any"
                    required
                    value={Number.isNaN(value) ? "" : value}
                    aria-label={labelOf(key)}
                    onChange={(e) => changeParam(key, e.target.valueAsNumber)}
                  />
                  <span>
                    {/angle/i.test(key)
                      ? "°"
                      : /segments|count/i.test(key)
                      ? ""
                      : "mm"}
                  </span>
                </div>
              </label>
            ))}
          </div>
          <button className="primary" type="submit" disabled={!selected}>
            Rebuild part <span>↗</span>
          </button>
        </form>
        <button
          id="reset"
          disabled={!selected}
          onClick={() => {
            if (selected) select(selected, true);
          }}
        >
          Reset this part
        </button>
        <p className="note">
          Built from source profiles and component dimensions. Compare side by
          side or use Overlay to inspect the match against the original model.
        </p>
        <a
          className="source-link"
          href="https://strengthshop.eu/products/3d-rack-builder-riot-mrr-75"
          target="_blank"
          rel="noreferrer"
        >
          Original reference ↗
        </a>
      </section>
    </div>
  );
}
