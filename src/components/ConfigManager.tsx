import { useEffect, useState } from "react";
import { shallowEqual, useStoreSelector } from "../state/use-store.ts";
import type { BuilderStore } from "../state/builder-store.ts";
export function ConfigManager({ store }: { store: BuilderStore }) {
  const state = useStoreSelector(store, s => ({ configs: s.configs, activeId: s.activeId, dirty: s.dirty, storageReady: s.storageReady, storageError: s.storageError, draftAvailable: s.draftAvailable }), shallowEqual);
  const [name, setName] = useState("My rack");
  const [busy, setBusy] = useState(false);
  const savedName = state.configs.find((c) => c.id === state.activeId)?.name;
  useEffect(() => setName(savedName ?? "My rack"), [savedName, state.activeId]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      store.status(String(error), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="config-manager">
      {/* The unsaved marker shrinks to a dot on narrow tablet toolbars (#215), so the summary never wraps. */}
      <summary>Configurations{state.dirty && <span className="config-unsaved" title="Unsaved changes"> • Unsaved</span>}</summary>
      <fieldset disabled={busy || !state.storageReady}>
        {state.storageError && <p role="alert">{state.storageError}</p>}
        <label>
          Saved configuration
          <select
            aria-label="Saved configuration"
            value={state.activeId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const config = state.configs.find((c) => c.id === id);
              if (config) {
                setName(config.name);
                void run(() => store.load(id));
              }
            }}
          >
            <option value="" disabled>
              Select a rack
            </option>
            {state.configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Configuration name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={!state.activeId}
          onClick={() => void run(() => store.load(state.activeId!))}
        >
          Load saved version
        </button>
        <button type="button" onClick={() => void run(() => store.save(name))}>
          Save configuration
        </button>
        <button
          type="button"
          onClick={() => void run(() => store.save(name, true))}
        >
          Save as new / duplicate
        </button>
        <button
          type="button"
          disabled={!state.activeId}
          onClick={() => void run(() => store.rename(state.activeId!, name))}
        >
          Rename
        </button>
        <button
          type="button"
          disabled={!state.activeId}
          onClick={() => void run(() => store.deleteConfig(state.activeId!))}
        >
          Delete configuration
        </button>
        {state.draftAvailable && (
          <button type="button" onClick={store.recoverDraft}>
            Recover unsaved draft
          </button>
        )}
      </fieldset>
    </details>
  );
}
