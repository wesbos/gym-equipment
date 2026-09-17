import { NumericControl } from "../components/NumericControl.tsx";
import { LatestRequest } from "../geometry/latest-request.ts";
import type { UprightWorkerRequest } from "../../rack-generator/worker-types.ts";
import type { PartScene, View } from "../scenes/part-scene";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { defaults } from "../../rack-generator/model.ts";
import { createPartScene } from "../scenes/part-scene";
import "../../rack-generator/style.css";
import type { UprightWorkerResponse } from "../../rack-generator/worker-types.ts";
import type { UprightMesh as Model } from "../../rack-generator/types.ts";
type Params = typeof defaults;
const fields: {
  key: keyof Params;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "height", label: "Upright height", min: 4, max: 157, step: 0.25 },
  { key: "width", label: "Tubing width", min: 30, max: 150, step: 0.1 },
  { key: "wall", label: "Wall thickness", min: 1, max: 30, step: 0.1 },
  { key: "radius", label: "Outer corner radius", min: 0, max: 70, step: 0.1 },
  { key: "diameter", label: "Hole diameter", min: 2, max: 100, step: 0.1 },
  { key: "spacing", label: "Centre spacing", min: 3, max: 1000, step: 0.1 },
  {
    key: "offset",
    label: "First centre from base",
    min: 2,
    max: 3000,
    step: 0.1,
  },
];
export default function UprightPage() {
  const form = useRef<HTMLFormElement>(null);
  const viewport = useRef<HTMLDivElement>(null),
    scene = useRef<PartScene | null>(null),
    worker = useRef<Worker | null>(null),
    requests = useRef<LatestRequest<UprightWorkerRequest> | null>(null),
    sequence = useRef(0),
    pairRef = useRef(true),
    modelRef = useRef<Model | null>(null);
  const [params, setParams] = useState<Params>({ ...defaults }),
    [inputRevision, setInputRevision] = useState(0),
    [model, setModel] = useState<Model | null>(null),
    [pair, setPair] = useState(true),
    [wireframe, setWireframe] = useState(false),
    [view, setView] = useState<View>("iso"),
    [status, setStatus] = useState("Initializing geometry…"),
    [error, setError] = useState(false),
    [valid, setValid] = useState(false);
  function update(next: Params) {
    setStatus("Building solid…");
    setError(false);
    setValid(false);
    requests.current?.submit({ id: ++sequence.current, params: next });
  }
  useEffect(() => {
    if (!viewport.current) return;
    let active = true;
    const controller = createPartScene(viewport.current, (message) => {
      setStatus(message);
      setError(true);
    });
    scene.current = controller;
    const geometryWorker = new Worker(
      new URL("../../rack-generator/worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.current = geometryWorker;
    requests.current = new LatestRequest(value => geometryWorker.postMessage(value));
    geometryWorker.onerror = (e) => {
      if (active) {
        setStatus(e.message || "Could not initialize geometry engine.");
        setError(true);
        setValid(false);
      }
    };
    geometryWorker.onmessage = ({
      data,
    }: MessageEvent<UprightWorkerResponse>) => {
      if (!active) return;
      requests.current?.complete();
      if (data.id !== sequence.current) return;
      if ("error" in data) {
        setStatus(data.error);
        setError(true);
        setValid(false);
        return;
      }
      const next = data.model;
      modelRef.current = next;
      setModel(next);
      controller.setMeshes(
        [{ ...next, role: "frame", name: "BOS STRENGTH upright (millimetres)" }],
        pairRef.current
      );
      setStatus(
        `${next.centers.length} holes / face · ${(
          next.indices.length / 3
        ).toLocaleString()} triangles / upright`
      );
      setError(false);
      const invalid = !!form.current?.querySelector('[aria-invalid="true"]');
      setValid(!invalid);
      if (invalid) setStatus("Enter a valid number in every field.");
    };
    update({ ...defaults });
    return () => {
      active = false;
      ++sequence.current;
      geometryWorker.onmessage = null;
      geometryWorker.onerror = null;
      geometryWorker.terminate();
      requests.current?.clear();
      requests.current = null;
      worker.current = null;
      controller.dispose();
      scene.current = null;
    };
  }, []);
  function field(key: keyof Params) {
    const def = fields.find((f) => f.key === key)!;
    return (
      <label
        key={key}
        className={key === "height" ? "height-label" : ""}
        htmlFor={key}
      >
        {def.label}
        <div className="input-wrap">
          <NumericControl label={def.label} name={key} value={params[key]} min={def.min} max={def.max} step={def.step}
            onInvalid={() => { ++sequence.current; setValid(false); setStatus("Enter a valid dimension."); }}
            onValue={value => { const next = { ...params, [key]: value }; setParams(next); update(next); }} />
          <span>{key === "height" ? "in" : "mm"}</span>
        </div>
      </label>
    );
  }
  return (
    <div className="upright-page">
      <aside>
        <div className="eyebrow">
          BOS STRENGTH <span>01 / UPRIGHT</span>
        </div>
        <h1>Built to measure.</h1>
        <p className="intro">
          A parametric squat rack upright.
          <br />
          Set your dimensions. Explore the details.
          <br />
          <Link to="/parts">Explore the full parts library →</Link>
        </p>
        <form
          id="parameters"
          ref={form}
          key={inputRevision}
          onSubmit={(e) => {
            e.preventDefault();
            update(params);
          }}
        >
          <div className="section-title">
            01 <span>Dimensions</span>
            <small>INCHES + MM</small>
          </div>
          {field("height")}
          <p id="height-mm" className="conversion">
            {(params.height * 25.4).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            mm
          </p>
          <div className="fields">
            {(["width", "wall", "radius"] as const).map(field)}
          </div>
          <div className="section-title">
            02 <span>Hole pattern</span>
            <small>ALL FOUR FACES</small>
          </div>
          <div className="fields">
            {(["diameter", "spacing", "offset"] as const).map(field)}
          </div>
          <button className="primary" type="submit">
            Update model <span>↗</span>
          </button>
        </form>
        <p className="note">
          Metric 75 mm starting dimensions. Radius, wall, hole diameter and end
          offsets are assumptions—measure your rack for an exact fit.
        </p>
        <div className="aside-footer">
          <button
            id="reset"
            onClick={() => {
              setInputRevision(n => n + 1);
              setParams({ ...defaults });
              update({ ...defaults });
            }}
          >
            Reset dimensions
          </button>
          <span>MANIFOLD ENGINE</span>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="live-dot" /> UPRIGHT STUDY{" "}
            <span className="muted">/ 3D MODEL</span>
          </div>
          <button
            id="export"
            disabled={!valid}
            onClick={() => {
              void scene.current
                ?.exportGLB(`bos-strength-upright-${model?.params.height}in`)
                .catch((e) => {
                  setStatus(String(e));
                  setError(true);
                });
            }}
          >
            Export GLB ↓
          </button>
        </header>
        <div
          id="viewport"
          ref={viewport}
          aria-label="Interactive 3D upright viewer"
        >
          <div className="view-tools">
            {(["iso", "front", "top", "side", "detail"] as const).map((v) => (
              <button
                key={v}
                data-view={v}
                className={view === v ? "selected" : ""}
                onClick={() => {
                  setView(v);
                  scene.current?.fit(v);
                }}
              >
                {v === "iso"
                  ? "Perspective"
                  : v === "detail"
                  ? "Hole detail"
                  : v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="display-tools">
            <label>
              <input
                id="pair"
                type="checkbox"
                checked={pair}
                onChange={(e) => {
                  setPair(e.target.checked);
                  pairRef.current = e.target.checked;
                  if (modelRef.current)
                    scene.current?.setMeshes(
                      [
                        {
                          ...modelRef.current,
                          role: "frame", name: "BOS STRENGTH upright (millimetres)",
                        },
                      ],
                      e.target.checked
                    );
                }}
              />{" "}
              Pair
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
        </div>
        <div className="model-caption">
          <h2 id="model-title">{model?.params.height ?? 80}″ upright</h2>
          <p id="model-description">
            {model
              ? `${model.params.width} × ${model.params.width} mm / ${model.params.wall} mm wall / ${model.params.spacing} mm pitch`
              : "75 × 75 mm / hollow steel section"}
          </p>
        </div>
        <footer>
          <span id="status" role="status" className={error ? "error" : ""}>
            {status}
          </span>
          <span>DRAG TO ORBIT · SCROLL TO ZOOM · RIGHT-DRAG TO PAN</span>
        </footer>
      </main>
    </div>
  );
}
