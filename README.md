# BOS STRENGTH · Gym Builder

Design a squat rack, then the whole gym around it, in the browser. Every part is parametric CAD generated on the fly
(no downloaded meshes), snaps to real 75 mm tubing and 50 mm hole spacing, and exports to GLB or a print-ready 3MF.

**Live at [gym.wesbos.com](https://gym.wesbos.com)**

![A full garage gym open in the builder: red power racks, machines, dumbbells and plates in a walled room](docs/readme/hero.jpg)

---

## Start from a real gym

Eleven real home and garage gyms, recreated piece by piece from [Gym Radar](https://gymradar.com) and gym tours. Open
one to remix it; whatever you had unsaved is kept as a configuration.

![The gym gallery: cards with renders of each recreated gym](docs/readme/gyms.jpg)

Each gym has a detail page with its equipment list, and a permanent builder link (`/?gym=<slug>`) you can share. The
link stays in the address bar until you change something.

![A gym detail page with the render, highlights and full equipment list](docs/readme/gym-detail.jpg)

While a big design loads, the stage shows real progress as each model is generated:

![The canvas dimmed under a "Loading models · 12 of 41" progress card](docs/readme/loading.jpg)

## Build it

### 500+ parts

Uprights and crossmembers, J-hooks and safeties, benches, machines, cable towers, bars, plates, storage, cardio and
more — BOS STRENGTH's own parts plus independent reconstructions of gear from Rogue, REP, Titan, Bells of Steel and
others. Press <kbd>/</kbd> for the parts gallery.

![The parts gallery with category rail and thumbnail grid](docs/readme/parts-gallery.jpg)

![The parts gallery filtered to Rogue](docs/readme/parts-gallery-search.jpg)

### Place, snap, move

Attachments show their valid mount holes and a ghost preview; click to place. Floor items drag and snap to a 25 mm
grid (hold <kbd>Alt</kbd> to turn snapping off), <kbd>R</kbd> or <kbd>Alt</kbd>+scroll rotates, and double-click picks
anything back up.

![Placing a J-hook: amber ghost on the rack with a placement hint bar](docs/readme/placement.jpg)

### Inspect and edit

Select anything for the floating action bar (move, rotate, duplicate, lock, focus, delete) and a full inspector with
the part's options, placement and finish.

![A selected leg extension machine with the action bar above it and the inspector on the right](docs/readme/selection-inspector.jpg)

### The room

Walls, flooring, turf and ceiling, each with their own finishes. Wall items (pegboards, bar holders) hang on the walls
and attachments hang on them.

![The room inspector open with walls and flooring around a gym](docs/readme/room.jpg)

### Outliner, hide and lock

The outliner (<kbd>O</kbd>) lists every piece grouped by rack, floor and wall. Hide parts to see behind them, and
**lock** parts in a busy gym so dragging to orbit never nudges them.

![The outliner beside the canvas with some parts locked](docs/readme/outliner.jpg)

### Every view

3D, front, side and top (<kbd>1</kbd>–<kbd>4</kbd>), with a tight fit-to-view.

![Top-down plan view of a basement gym](docs/readme/top-view.jpg)

## Power tools

<kbd>⌘</kbd><kbd>K</kbd> opens a command palette for every action and every part:

![The command palette filtered to lock commands](docs/readme/command-palette.jpg)

<kbd>?</kbd> shows every shortcut, generated from the same registry the keys use:

![The keyboard shortcuts overlay](docs/readme/shortcuts.jpg)

Undo/redo with a scrubbable history timeline (the panel toggles at the top of the canvas show it), named configurations saved in the browser, JSON import/export, and a
"Play build" animation that assembles the gym piece by piece.

## Export

**GLB** for the whole scene, or a **3MF** miniature (1:10 or 1:20) laid out on Parts and Hardware plates, ready for
Bambu Studio or OrcaSlicer. See [docs/print-export.md](docs/print-export.md).

![The export menu with 3MF print options](docs/readme/export-menu.jpg)

## Parts library and part viewer

Browse every part at [/library](https://gym.wesbos.com/library), then open any part to tweak its parameters on its own
and export it.

![The parts library grid](docs/readme/library.jpg)

![The part viewer showing a Bells of Steel cable tower with its loading, pin and carriage options](docs/readme/part-viewer.jpg)

## Phones and tablets

The builder works on touch: one finger orbits, two pan and pinch, long-press picks a part up, and a bottom sheet holds
the parts, inspector, timeline, room and outliner.

<p>
  <img src="docs/readme/mobile-builder.jpg" alt="The builder on a phone with the bottom sheet tabs" width="295">
  &nbsp;
  <img src="docs/readme/mobile-gyms.jpg" alt="The gym gallery on a phone" width="295">
</p>

![The builder on an iPad in landscape](docs/readme/tablet-builder.jpg)

---

## Development

```sh
npm install
npm run dev          # Vite dev server on 127.0.0.1
npm test             # unit tests (node:test via tsx)
npm run typecheck
npm run build        # typecheck + production build
npm run deploy       # build + wrangler deploy (Cloudflare)
```

- **Stack:** React 19, TanStack Router, three.js, Vite, Cloudflare Workers static assets.
- **Geometry:** parts are authored in TypeScript (`rack-generator/`) and built with
  [manifold-3d](https://github.com/elalish/manifold) in a web worker; the scene caches models by their parameters.
- **Gyms:** each gallery gym is a JSON document in `src/gyms/data/` with a preview render in `public/gyms/`.
- **More docs:** [topology](docs/topology.md) · [custom logos](docs/custom-logos.md) ·
  [print export](docs/print-export.md) · [equipment catalog](docs/equipment-catalog.md) ·
  [multi-select](docs/multiselect.md)

Third-party equipment is independently reconstructed from published dimensions and product photos; trademarks belong
to their owners. Gyms and equipment lists belong to their owners.
