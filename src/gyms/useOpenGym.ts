import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { BuilderStore } from "../state/builder-store.ts";
import { loadGym } from "./gyms.ts";

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
 * Opens `/?gym=<slug>` as a new unsaved design (the user's draft is kept, see `BuilderStore.openDesign`)
 * and then drops the param, so a reload doesn't reopen the gym over later edits. `beforeOpen` lets the
 * scene reframe the camera on the gym.
 */
export function useOpenGym(store: BuilderStore, beforeOpen?: () => void) {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const slug = typeof search[GYM_PARAM] === "string" ? (search[GYM_PARAM] as string) : null;
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const gym = await loadGym(slug);
        if (cancelled) return;
        if (!gym) store.status(`No gym called “${slug}” in the gallery.`, true);
        else {
          beforeOpen?.();
          const kept = await store.openDesign(gym.doc, gym.title);
          if (kept) announceAfterBuild(store, `Opened ${gym.title}. Your unsaved design is kept under Configurations as “${kept}”.`);
        }
      } catch (error) {
        store.status(`Could not open gym: ${error instanceof Error ? error.message : String(error)}`, true);
      }
      if (!cancelled) {
        const { [GYM_PARAM]: _opened, ...rest } = search;
        void navigate({ to: "/", search: rest as never, replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only a new slug opens a gym; the rest of the search is carried along when clearing it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, store]);
}
