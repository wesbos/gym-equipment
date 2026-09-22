import { HistoryTimeline } from '../components/HistoryTimeline.tsx';
import { CommandPalette } from '../components/CommandPalette/CommandPalette.tsx';
import { builderShortcutHandlers, type EditorApi } from '../components/CommandPalette/commands.ts';
import { ShortcutsOverlay } from '../components/ShortcutsOverlay/ShortcutsOverlay.tsx';
import { Outliner } from '../components/Outliner/Outliner.tsx';
import { WarningsList, WarningsButton } from '../components/Warnings/Warnings.tsx';
import { requestExport } from '../components/ExportMenu.tsx';
import { ariaKeys, dispatchShortcut, shortcutLabel } from '../state/shortcuts.ts';
import { openPanel, toggleOutliner, useOutlinerOpen } from '../state/editor-ui.ts';
import { SystemPlacementOptions } from '../components/CableSmithControls.tsx';
import { floorPart } from '../../rack-generator/floor-registry.ts';
import { VendorCredit } from '../components/VendorControls.tsx';
import { ExportMenu } from '../components/ExportMenu.tsx';
import { RackPresets } from '../components/RackPresets.tsx';
import { structureSlots } from '../../rack-generator/topology.ts';
import { ConfigManager } from "../components/ConfigManager.tsx";
import { PartGallery, GalleryLauncher, CompactCatalog, BrowseCategories, openGallery } from "../components/PartGallery/index.ts";
import { BuilderSheet, OverflowMenu, PanelToggles, isPhoneLayout, useLayoutMode, type SheetTab } from "../components/MobileShell/index.ts";
import { TAB_ICONS } from "../components/MobileShell/tab-icons.tsx";
import { placementCopy } from "../state/placement-copy.ts";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { getBuilderStore, type BuilderSnapshot, type BuilderStore, type CatalogPart } from "../state/builder-store.ts";
import { shallowEqual, useStoreSelector } from "../state/use-store.ts";
import { useOpenGym } from "../gyms/useOpenGym.ts";
import { createBuilderScene, type BuilderScene } from "../scenes/builder-scene.ts";
import { InspectorPanel } from "../components/Inspector/InspectorPanel.tsx";
import { SelectionBar } from "../components/SelectionBar/SelectionBar.tsx";
import { Toaster } from "../components/Toast/Toaster.tsx";
import { BuildProgress } from "../components/BuildProgress/BuildProgress.tsx";
import { clearHistoryWithUndo, resetRackWithUndo } from "../components/Toast/undo-actions.ts";
import {
  getPartPlacementInfo,
  getAvailableStructure,
  restoreInstance,
  STRUCTURE_SLOTS,
} from "../../rack-generator/assembly.ts";
import type {
  PlacementField,
} from "../../rack-generator/types.ts";
import "../../rack-generator/builder.css";
import "../components/history-timeline.css";
import "../components/MobileShell/mobile-shell.css";
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
    <aside className="catalog-panel" data-sheet-panel="parts">
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
function RoomButton({ store }: { store: BuilderStore }) {
  const open = useStoreSelector(store, s => s.roomInspector);
  return <button id="room-button" aria-pressed={open} title="Walls, floor, turf and ceiling" onClick={() => open ? store.select(null) : store.openRoom()}>Room</button>;
}
function SelectToolButton({ store }: { store: BuilderStore }) {
  const selectionTool = useStoreSelector(store, s => s.selectionTool);
  return <button aria-pressed={selectionTool} onClick={() => store.patch({ selectionTool: !selectionTool })}>Select</button>;
}
const VIEW_LABEL = { iso: "3D", front: "Front", side: "Side", top: "Top" } as const;
type BuilderView = keyof typeof VIEW_LABEL;
/** The view buttons. On phones they fold into a compact menu behind one button that shows the current view. */
function ViewControls({ store, view, fit }: { store: BuilderStore; view: BuilderView; fit: (mode: BuilderView) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div className="view-menu" ref={root} data-open={open || undefined}>
      <button type="button" className="view-menu-trigger" aria-label={`View: ${VIEW_LABEL[view]}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {VIEW_LABEL[view]} <span aria-hidden="true">▾</span>
      </button>
      <div className="view-controls" onClick={e => { if ((e.target as Element).closest("button")) setOpen(false); }}>
        <SelectToolButton store={store} />
        <RoomButton store={store} />
        {(["iso", "front", "side", "top"] as const).map((mode) => (
          <button
            key={mode}
            data-view={mode}
            aria-pressed={view === mode}
            onClick={() => fit(mode)}
          >
            {VIEW_LABEL[mode]}
          </button>
        ))}
      </div>
    </div>
  );
}
/** The builder shell reaches into the safe areas (notch, home indicator) on phones; other pages keep the default. */
function useViewportFitCover() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta || meta.content.includes("viewport-fit")) return;
    const original = meta.content;
    meta.content = `${original}, viewport-fit=cover`;
    return () => { meta.content = original; };
  }, []);
}
/** Studio: the parts panel and inspector float over a full-bleed canvas. Tell the scene how much of each side they
 * cover, so the model centres (and Fit view frames) in the open canvas between them. Phones use the bottom sheet. */
function useFloatingPanelInsets(shell: RefObject<HTMLDivElement | null>, viewport: RefObject<HTMLDivElement | null>, scene: BuilderScene | null, phone: boolean) {
  useLayoutEffect(() => {
    const root = shell.current, canvas = viewport.current;
    if (!scene || !root || !canvas) return;
    const measure = () => {
      if (phone) { scene.setViewInsets({ left: 0, right: 0 }); return; }
      const area = canvas.getBoundingClientRect();
      const cover = (selector: string, side: 'left' | 'right') => {
        const panel = root.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
        if (!panel?.width) return 0;
        return Math.max(0, side === 'left' ? panel.right - area.left : area.right - panel.left);
      };
      scene.setViewInsets({ left: cover('.catalog-panel', 'left'), right: cover('.inspector-panel', 'right') });
    };
    measure();
    const resize = new ResizeObserver(measure), toggles = new MutationObserver(measure);
    resize.observe(root); resize.observe(canvas);
    toggles.observe(root, { attributes: true, attributeFilter: ['data-hide-left', 'data-hide-right'] });
    return () => { resize.disconnect(); toggles.disconnect(); };
  }, [shell, viewport, scene, phone]);
}
/** Phone sheet tabs (see components/MobileShell). */
const SHEET_TABS: readonly SheetTab[] = [
  { id: "parts", label: "Parts", icon: TAB_ICONS.parts },
  { id: "inspector", label: "Inspector", icon: TAB_ICONS.inspector },
  { id: "timeline", label: "Timeline", icon: TAB_ICONS.timeline },
  { id: "room", label: "Room", panel: "inspector", icon: TAB_ICONS.room },
  { id: "outliner", label: "Outliner", icon: TAB_ICONS.outliner },
];
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
/** `(pointer: coarse)`: the primary input is a finger (placement hints use touch wording, #215). */
const COARSE = "(pointer: coarse)";
function subscribeCoarse(notify: () => void) {
  if (typeof matchMedia !== "function") return () => {};
  const list = matchMedia(COARSE);
  list.addEventListener("change", notify);
  return () => list.removeEventListener("change", notify);
}
const useCoarsePointer = () => useSyncExternalStore(subscribeCoarse, () => typeof matchMedia === "function" && matchMedia(COARSE).matches, () => false);
function PlacementHint({ store }: { store: BuilderStore }) {
  const nameOf = usePartNames(store).name, coarse = useCoarsePointer();
  const hint = useStoreSelector(store, s => (s.placing || s.structureChoice || s.systemChoice) ? {
    placingPart: s.placing?.part ?? null, structureChoice: s.structureChoice, placementText: s.placementText,
    hasProposal: !!s.proposal, rotationOnly: !!s.placing?.rotationOnly, addMode: !!s.structureChoice && s.structureMode === "add",
    movePair: !!s.placing?.movingId && !!getPartPlacementInfo(s.placing.part, s.doc)?.paired, paired: s.paired,
  } : null, shallowEqual);
  if (!hint) return null;
  return (
    <div className="placement-hint" id="placement-hint">
      <span id="placement-text">
        {hint.placementText ? placementCopy(hint.placementText, coarse) :
          `Place ${nameOf(hint.placingPart ?? hint.structureChoice!)}`}
      </span>
      {!hint.addMode && <button id="accept-placement" disabled={!hint.hasProposal} onClick={store.acceptProposal}>{hint.rotationOnly ? "Apply rotation" : "Place"}</button>}
      {hint.movePair && <label><input type="checkbox" checked={hint.paired} onChange={e => store.patch({ paired: e.target.checked })} /> Move pair together</label>}
      <button id="cancel-placement" onClick={store.cancelPlacement}>
        Cancel{!coarse && <> <kbd>ESC</kbd></>}
      </button>
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
    seek={store.seekHistory} restore={() => store.restoreHistory()} clear={() => void clearHistoryWithUndo(store)}
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
  const layout = useLayoutMode(), phoneLayout = isPhoneLayout(layout);
  useViewportFitCover();
  const shell = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null),
    controller = useRef<ReturnType<typeof createBuilderScene> | null>(null),
    importFile = useRef<HTMLInputElement>(null);
  const [scene, setScene] = useState<BuilderScene | null>(null);
  useOpenGym(store, () => controller.current?.refitOnNextBuild());
  useFloatingPanelInsets(shell, viewport, scene, phoneLayout);
  const outliner = useOutlinerOpen(),
    [view, setView] = useState<BuilderView>("iso");
  const navigate = useNavigate(), navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // Page-level actions the command palette, shortcuts, outliner and warnings share (#206). Stable for the page's life.
  const [api] = useState<EditorApi>(() => ({
    store,
    scene: () => controller.current,
    view: mode => { setView(mode); controller.current?.fit(mode); },
    saveJSON: () => download(new Blob([store.exportJSON()], { type: "application/json" }), "bos-strength-rack.json"),
    loadJSON: () => importFile.current?.click(),
    openGyms: () => { void navigateRef.current({ to: "/gyms" }); },
    exportFile: format => requestExport(format),
    // Undo toast (#205) instead of a confirm: the reset is one history step.
    resetRack: () => { resetRackWithUndo(store, () => controller.current?.refitOnNextBuild()); },
  }));
  useEffect(() => {
    const scene = createBuilderScene(viewport.current!, store);
    controller.current = scene;
    setScene(scene);
    // Every builder shortcut, from the one registry (src/state/shortcuts.ts); the "?" overlay lists the same entries.
    const handlers = builderShortcutHandlers(api);
    const keyboard = (e: KeyboardEvent) => { dispatchShortcut(e, handlers); };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      scene.dispose();
      controller.current = null;
      setScene(null);
    };
  }, [store, api]);
  const fit = (mode = view) => {
    setView(mode);
    controller.current?.fit(mode);
  };
  return (
    <div className="builder-page" data-layout={layout}>
      <div className="builder-shell" ref={shell}>
        <header className="toolbar">
          <Link className="brand" to="/" aria-label="BOS STRENGTH rack builder">
            <span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>
            BOS STRENGTH<small>RACK BUILDER</small>
          </Link>
          <div className="project-heading">
            <span className="live-dot" /> YOUR WORKSPACE
          </div>
          <div className="toolbar-actions">
            {/* Toolbar actions slot (#203): components that belong in the top bar at every size. */}
            <div className="toolbar-slot" data-slot="toolbar-actions">
              <button id="open-palette" className="palette-launch" aria-haspopup="dialog" aria-keyshortcuts={ariaKeys("command-palette")}
                title={`Search actions and parts (${shortcutLabel("command-palette")})`} onClick={() => openPanel("palette")}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
                <span className="palette-launch-label">Search</span><kbd aria-hidden="true">{shortcutLabel("command-palette")}</kbd>
              </button>
            </div>
            <HistoryButtons store={store} />
            <button type="button" className="toolbar-add primary" aria-haspopup="dialog" aria-label="Add parts" onClick={() => openGallery()}>
              {/* The narrowest phones show "+ Add" (#215). */}
              <span aria-hidden="true">+</span><span className="toolbar-add-label">Add<span className="toolbar-add-noun"> parts</span></span>
            </button>
            <OverflowMenu>
              {/* Studio: every secondary action lives in this one menu at every size. */}
              <Link className="gyms-link" to="/gyms" data-menu-close>Gym gallery</Link>
              <Link className="menu-only" to="/library" data-menu-close>Parts library ↗</Link>
              <span className="menu-divider" role="separator" />
              <ConfigManager store={store} />
              {/* "JSON" is visually hidden on portrait-tablet toolbars (#215); the accessible names stay whole. */}
              <button id="load" data-menu-close onClick={() => importFile.current?.click()}>
                Load<span className="toolbar-word"> JSON</span>
              </button>
              <button
                id="save"
                data-menu-close
                onClick={api.saveJSON}
              >
                Save<span className="toolbar-word"> JSON</span>
              </button>
              <ExportControl store={store} controller={controller} />
              <span className="menu-divider" role="separator" />
              <button type="button" className="menu-only" data-menu-close onClick={() => store.openRoom()}>Room: walls, floor & ceiling</button>
            </OverflowMenu>
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
        <main className="stage">
          <div id="viewport" ref={viewport} />
          <ViewControls store={store} view={view} fit={fit} />
          <StageCaption store={store} />
          <div className="stage-actions">
            <button id="fit" onClick={() => fit()}>
              Fit view
            </button>
            <button
              id="parts-toggle"
              aria-expanded={phoneLayout ? undefined : outliner}
              aria-controls={outliner && !phoneLayout ? "outliner" : undefined}
              aria-keyshortcuts={ariaKeys("toggle-outliner")}
              title={`Outliner (${shortcutLabel("toggle-outliner")})`}
              onClick={toggleOutliner}
            >
              Outliner (<PartsCount store={store} />)
            </button>
            <button id="shortcuts-button" aria-label="Keyboard shortcuts" aria-keyshortcuts={ariaKeys("shortcuts")} title="Keyboard shortcuts (?)" onClick={() => openPanel("shortcuts")}>?</button>
            <WarningsButton api={api} />
          </div>
          <PanelToggles shell={shell} />
          <PlacementHint store={store} />
          {/* Floating overlay slot (#203): overlays over the canvas (e.g. the selection action bar) mount here. The slot
           * ignores pointer events and its children receive them; on phones it ends above the sheet. */}
          <div className="stage-overlay" data-slot="stage-overlay">
            <SelectionBar store={store} scene={scene} />
            <BuildProgress store={store} />
          </div>
          {outliner && !phoneLayout && <Outliner api={api} />}
        </main>
        <BuilderSheet store={store} tabs={SHEET_TABS}>
          <CatalogPanel store={store} />
          {/* Inspector region (#203): the sheet's Inspector and Room tab on phones, the right column elsewhere. */}
          <aside className="inspector-panel" data-sheet-panel="inspector">
            <InspectorPanel store={store} onResetRack={() => controller.current?.refitOnNextBuild()}>
              <WarningsList api={api} />
            </InspectorPanel>
          </aside>
          {/* Outliner tab on phones (#206); on tablet and desktop the outliner floats over the stage instead. */}
          <div className="outliner-region" data-sheet-panel="outliner" hidden={!phoneLayout}>
            {phoneLayout && <Outliner api={api} variant="sheet" />}
          </div>
          <div className="timeline-region" data-sheet-panel="timeline">
            <TimelineBar store={store} controller={controller} />
          </div>
          <StatusBar store={store} />
        </BuilderSheet>
        <Toaster />
      </div>
      <PartGallery store={store} />
      <CommandPalette api={api} />
      <ShortcutsOverlay />
    </div>
  );
}
