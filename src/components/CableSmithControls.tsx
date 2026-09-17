import { ResetButton } from "./ResetButton.tsx";
import { useState, useSyncExternalStore } from "react";
import type { BuilderStore } from "../state/builder-store.ts";
import { PartThumbnail } from "./PartThumbnail.tsx";
import { NumericControl } from "./NumericControl.tsx";
import {
  SYSTEM_DEFAULTS,
  SYSTEM_NAMES,
  SYSTEM_NOTE,
  SYSTEM_PARTS,
  type RackSystem,
  type SystemPartId,
} from "../../rack-generator/system-types.ts";
import { systemWarnings, withSystem } from "../../rack-generator/systems.ts";
import {
  validateAssembly,
  removeInstance,
} from "../../rack-generator/assembly.ts";
import type { NumericParams } from "../../rack-generator/types.ts";
function Options({
  part,
  p,
  height,
  onChange,
  onGestureStart,
  onGestureEnd,
}: {
  part: SystemPartId;
  p: NumericParams;
  height: number;
  onChange: (patch: NumericParams) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) {
  const smith = part === "smith-rep",
    ares = part.includes("ares"),
    defaults = SYSTEM_DEFAULTS[part];
  const reset = (key: string, label: string) => (
    <ResetButton
      label={label}
      changed={p[key] !== defaults[key]}
      value={defaults[key]}
      onReset={() => onChange({ [key]: defaults[key] })}
    />
  );
  const select = (key: string, label: string, options: [number, string][]) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <select
        aria-label={label}
        value={p[key]}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
      >
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      {reset(key, label)}
    </label>
  );
  const toggle = (key: string, label: string) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={!!p[key]}
        onChange={(e) => onChange({ [key]: +e.target.checked })}
      />
      {reset(key, label)}
    </label>
  );
  return (
    <>
      {smith ? (
        <>
          {select("outside", "Smith mounting", [[0, "Inside rack"], [1, "Front — PR-5000, full FFE 2.0 pair"]])}
          {select("angle", "Smith install angle", [
            [-5, "−5°"],
            [0, "Vertical (0°)"],
            [5, "+5°"],
          ])}
          <label className="field">
            <span>Bar height (mm)</span>
            <NumericControl
              label="Smith bar height"
              defaultValue={defaults.barHeight}
              onGestureStart={onGestureStart}
              onGestureEnd={onGestureEnd}
              value={p.barHeight}
              min={396}
              max={height < 2200 ? 1721 : 2029}
              step={5}
              onValue={(v) => onChange({ barHeight: v })}
            />
          </label>
          <label className="field">
            <span>Safety stop height (mm)</span>
            <NumericControl
              label="Smith safety height"
              defaultValue={defaults.safetyHeight}
              onGestureStart={onGestureStart}
              onGestureEnd={onGestureEnd}
              value={p.safetyHeight}
              min={300}
              max={p.barHeight - 100}
              step={5}
              onValue={(v) => onChange({ safetyHeight: v })}
            />
          </label>
          <p className="note">
            Front includes reconstructed extension brackets and full FFE 2.0 feet; vertical PR-5000 only. Rods, bar and
            sleeves stay polished independently of bolt finish.
          </p>
        </>
      ) : (
        <>
          {!ares &&
            select("sides", "Cable sides", [
              [1, "Left"],
              [2, "Right"],
              [3, "Dual"],
            ])}
          {!ares && (
            <label className="field">
              <span>Loading</span>
              <select
                aria-label="Cable loading"
                value={p.loading}
                onChange={(e) =>
                  onChange({
                    loading: Number(e.target.value),
                    upgrade: 0,
                    shroud: 0,
                  })
                }
              >
                <option value={1}>Selectorized stack</option>
                <option value={0}>Plate loaded</option>
              </select>
              {reset("loading", "Cable loading")}
            </label>
          )}
          <p className="note">
            {p.loading
              ? part === "cable-kraken"
                ? "210 lb per stack"
                : part === "cable-athena"
                  ? `${p.upgrade ? 220 : 170} lb per stack`
                  : `${p.upgrade ? 310 : 260} lb per stack`
              : "Plate-loaded carriage with Olympic horns"}{" "}
            · 2:1 per output
            {part === "cable-kraken" ? " / combined 1:1 with adapter" : ""}
          </p>
          {p.loading === 1 &&
            part !== "cable-kraken" &&
            toggle("upgrade", "Upgraded stacks")}
          {p.loading === 1 && toggle("shroud", "Stack shrouds")}
          {part === "cable-kraken" && toggle("adapter", "1:1 output combiner")}
          {ares && toggle("handles", "Lat bar and row handle")}
          {toggle("anchored", "Floor-anchored installation")}
          <label className="field">
            <span>Trolley height (mm)</span>
            <NumericControl
              label="Cable trolley height"
              defaultValue={defaults.trolley}
              onGestureStart={onGestureStart}
              onGestureEnd={onGestureEnd}
              value={p.trolley}
              min={250}
              max={Math.min(height - 250, 2200)}
              step={10}
              onValue={(v) => onChange({ trolley: v })}
            />
          </label>
        </>
      )}
    </>
  );
}
function Installed({
  system,
  store,
}: {
  system: RackSystem;
  store: BuilderStore;
}) {
  const { doc } = store.getSnapshot();
  return (
    <details open>
      <summary>{SYSTEM_NAMES[system.part]}</summary>
      <Options
        part={system.part}
        p={system.params}
        height={doc.rack.height}
        onGestureStart={store.beginGesture}
        onGestureEnd={store.endGesture}
        onChange={(patch) =>
          store.act(() =>
            store.commit(
              withSystem(
                store.getSnapshot().doc,
                system.part,
                patch,
                system.id,
              ),
            ),
          )
        }
      />
      <button onClick={() => store.select(system.id)}>Select assembly</button>{" "}
      <button
        onClick={() =>
          store.act(() =>
            store.commit(removeInstance(store.getSnapshot().doc, system.id)),
          )
        }
      >
        Remove {SYSTEM_NAMES[system.part]}
      </button>
    </details>
  );
}
export function CableSmithControls({ store }: { store: BuilderStore }) {
  const { doc } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [part, setPart] = useState<SystemPartId>("cable-kraken");
  const [params, setParams] = useState<NumericParams>({
    ...SYSTEM_DEFAULTS[part],
  });
  let reason = "";
  try {
    validateAssembly(withSystem(doc, part, params));
  } catch (e) {
    reason = e instanceof Error ? e.message : String(e);
  }
  return (
    <details className="system-controls">
      <summary>Cable systems & Smith</summary>
      <p className="note">{SYSTEM_NOTE}</p>
      {(doc.systems ?? []).map((s) => (
        <Installed key={s.id} system={s} store={store} />
      ))}
      {systemWarnings(doc).map((w) => (
        <p className="note" key={w}>
          {w}
        </p>
      ))}
      <label className="field">
        <span>Add system</span>
        <select
          aria-label="System family"
          value={part}
          onChange={(e) => {
            const id = e.target.value as SystemPartId;
            setPart(id);
            setParams({ ...SYSTEM_DEFAULTS[id] });
          }}
        >
          {SYSTEM_PARTS.map((id) => (
            <option key={id} value={id}>
              {SYSTEM_NAMES[id]}
            </option>
          ))}
        </select>
      </label>
      <PartThumbnail part={part} />
      <Options
        part={part}
        p={params}
        height={doc.rack.height}
        onChange={(patch) => setParams({ ...params, ...patch })}
      />
      {reason && <p role="status">{reason}</p>}
      <button
        disabled={!!reason}
        onClick={() =>
          store.act(() =>
            store.commit(withSystem(store.getSnapshot().doc, part, params)),
          )
        }
      >
        Add {SYSTEM_NAMES[part]}
      </button>
      <p className="note">
        Vendor parts credited to{" "}
        <a
          href="https://repfitness.com/products/ares-2-0-cable-attachment-4-post-series"
          target="_blank"
          rel="noreferrer"
        >
          REP Fitness
        </a>{" "}
        and{" "}
        <a
          href="https://bellsofsteel.com/collections/all/products/kraken-4-post-hydra-manticore"
          target="_blank"
          rel="noreferrer"
        >
          Bells of Steel
        </a>
        . Historical ARES 1.0 dimensions are estimated. Kraken 108″
        raised-crossmember installation is not yet supported.
      </p>
    </details>
  );
}
