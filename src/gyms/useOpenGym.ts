import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { BuilderStore } from "../state/builder-store.ts";
import { loadGym } from "./gyms.ts";
import { openDesignWithUndo } from "../components/Toast/undo-actions.ts";

/** The scene reports each finished build in the status bar; say where the kept draft went once the gym has built. */
function announceAfterBuild(store: BuilderStore, message: string) {
  const done = () => {
    unsubscribe();
    clearTimeout(timer);
  };
  const unsubscribe = store.subscribe(() => {
    const { loading, status } = store.getSnapshot();
    if (!loading && /\d+ parts/.test(status)) {
      done();
      store.status(message);
    }
  });
  const timer = setTimeout(done, 60000);
}

/** Search param the gallery's "Open in builder" links use: `/?gym=<slug>`. */
export const GYM_PARAM = "gym";

/**
 * Opens `/?gym=<slug>` as a new unsaved design (the user's draft is kept, see `BuilderStore.openDesign`). The param
 * stays in the address bar while the gym is shown as published, so the URL is a permanent link to share (#220);
 * reloading it reopens the same gym without keeping a copy. The first edit (or opening anything else) drops the
 * param, so a reload never reopens the gym over the user's changes. `beforeOpen` lets the scene reframe the camera.
 */
export function useOpenGym(store: BuilderStore, beforeOpen?: () => void) {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const slug = typeof search[GYM_PARAM] === "string" ? (search[GYM_PARAM] as string) : null;
  useEffect(() => {
    if (!slug) return;
    let cancelled = false, stopWatching = () => {};
    const dropParam = () => {
      stopWatching();
      if (cancelled) return;
      const { [GYM_PARAM]: _opened, ...rest } = search;
      void navigate({ to: "/", search: rest as never, replace: true });
    };
    void (async () => {
      try {
        const gym = await loadGym(slug);
        if (cancelled) return;
        if (!gym) {
          store.status(`No gym called “${slug}” in the gallery.`, true);
          dropParam();
          return;
        }
        beforeOpen?.();
        let kept: string | null = null;
        // Undo toast (#205): opening replaces the design and its history, so Undo restores a checkpoint.
        await openDesignWithUndo(store, async () => { kept = await store.openDesign(gym.doc, gym.title); }, gym.title);
        if (kept) announceAfterBuild(store, `Opened ${gym.title}. Your unsaved design is kept under Configurations as “${kept}”.`);
        if (cancelled) return;
        // The link stands for the published gym: once the working document is anything else, it no longer applies.
        const opened = store.getSnapshot().doc;
        const unsubscribe = store.subscribe(() => { if (store.getSnapshot().doc !== opened) dropParam(); });
        stopWatching = unsubscribe;
      } catch (error) {
        store.status(`Could not open gym: ${error instanceof Error ? error.message : String(error)}`, true);
        dropParam();
      }
    })();
    return () => {
      cancelled = true;
      stopWatching();
    };
    // Only a new slug opens a gym; the rest of the search is carried along when clearing it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, store]);
}
