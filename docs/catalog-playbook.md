# Catalog playbook

How to add real products to the catalog. It's written for the parallel "catalog wave" agents, and it's also the house style for anyone adding parts. `docs/equipment-catalog.md` has the research list and popularity counts.

## Fidelity bar: model the real product

Each catalog entry is a specific, named product (brand + model), rebuilt so someone who owns it recognises it at a glance.

1. **Research first, and write it down.** For every product, collect:
   - **Published dimensions:** the tech specs table, dimension drawings, and manuals (PDF manuals often have exploded views with part sizes). Check the manufacturer page and 1–2 retailers.
   - **At least 8 photos from different angles:** the manufacturer gallery (Shopify stores serve full-size images at `…/cdn/shop/files/…`; `products/<handle>.json` lists every image URL), retailer galleries, and review sites (garagegymreviews.com, barbend.com, gymradar.com item pages). Download them into your scratchpad with `curl` and **look at them** with the Read tool. Front, side, top/overhead, close-ups of joints, pads, knurl, logos and feet.
   - **Colours and finishes:** powder-coat colour, chrome vs. zinc vs. cerakote, upholstery colour and stitching, rubber vs. urethane, and colour-coded bands.
   - Record sources, the dimension table you used, and every estimate you made in `rack-generator/research/<family>.md`, in the style of `research/nighthawk.md`.
2. **Model the silhouette and the details that make the product recognisable:** tube profiles and sizes, gussets, feet and caps, pads (rounded profiles, seams), wheels and handles, pins and pop-pins, logos as flat coloured plates or badges (no copied logo artwork), knurl bands as separate darker solids, and colour-coded rings.
3. **Verify visually against the photos, at least 2 rounds.** `npx tsx scripts/shoot-part.ts --port <your port> --out <scratchpad>/shots <part-id> [<part-id>@key=value,…]` renders the iso, front, side and top views. Read the PNGs next to your reference photos and fix proportions, missing features, colours and orientation. Do not open a PR until a side-by-side of your render and a product photo would convince the owner.

## Where code goes

Every family already has **slot files** wired into the registries and `catalog.ts`. **Only edit your family's files**; never edit `floor-registry.ts`, `hang-registry.ts`, `wall-registry.ts`, `rack-registry.ts`, `rack-mounts.ts`, `catalog.ts` or `BuilderPage.tsx`. That's how 20+ PRs merge without conflicts.

| Kind | Metadata (main bundle, no Manifold imports) | Builder |
|---|---|---|
| Floor item (free-standing) | `rack-generator/floor-parts/<family>.ts` → `export const PARTS = [A, B, …] as const` | `rack-generator/parts/<family>.ts` → `export const definitions = [floorDefinition(A, buildA), …]` |
| Hang item (hangs from a pegboard hook) | `rack-generator/hang-parts/<family>.ts` | `rack-generator/parts/<family>.ts` with `hangDefinition` |
| Wall item (mounted on a gym wall) | `rack-generator/wall-parts/<family>.ts` | `rack-generator/parts/<family>.ts` with `wallDefinition` |
| Rack attachment (mounts on the rack: upright hole or crossmember top) | `rack-generator/rack-parts/<family>.ts` (`defineRackPart`) | `rack-generator/parts/<family>.ts` with `rackDefinition` |

Put tests in `rack-generator/<family>.test.ts` and research notes in `rack-generator/research/<family>.md`. If you need more files, prefix them with your family slug (e.g. `parts/ergs-flywheel.ts`).

- **One catalog entry per product**, each with its own `id`, `title`, `vendor` attribution and `section`. Share one parametric builder across a family's products when they're structurally similar (e.g. all hex dumbbells). Real variants of one product (weights, lengths, colourways, leg heights) are **params** on that entry, not separate entries.
- **IDs:** `<brand>-<product>` in kebab case, e.g. `rogue-echo-bike`, `cap-rubber-hex-dumbbell`. Grep first so you never reuse an existing id.
- **Sections:** set `section` to one of `FLOOR_SECTIONS` / `HANG_SECTIONS` / `WALL_SECTIONS` / `RACK_SECTIONS` in `rack-generator/catalog-sections.ts`. The sidebar and `/library` group by it automatically.
- **Vendor attribution is required:** `{vendor, url, credit, trademark, reconstruction}`, like `floor-parts/powerblock.ts`. `reconstruction` states honestly what is published and what is estimated. Descriptions end with "Independent reconstruction …; <Brand> trademarks belong to <Brand>."
- **Params** are numeric selects: enums are 0/1/… with `format`, and `options` may depend on earlier params. Keep defaults to the most common real configuration.

## Geometry conventions

- Millimetres, Z up, built with Manifold (`manifold-3d`). Follow the `owned` list and `try/finally` delete pattern in `parts/powerblock.ts`: every intermediate Manifold/CrossSection is deleted, and only returned solids survive. Leaking WASM memory breaks the builder.
- **Floor parts:** origin on the floor at the footprint centre. The bounding box of all returned solids must match `footprint` (width along X, depth along Y) and sit at z ≥ 0. Test this, as `powerblock.test.ts` does.
- **Hang parts:** origin at the carabiner anchor, X along the wall, −Y out of it, Z up. `hook: 1` adds the peg pose. See `hang-part.ts` and `parts/cable-attachments.ts`.
- **Wall parts:** origin at the face centre on the wall surface, X along the wall, −Y out of the wall. See `wall-part.ts`.
- **Rack parts:** origin on the centreline of the tube it mounts to, on the axis of the target hole. +Y points **out** of the mounting face, so the mating face is `y = params.upright / 2`. X runs across the face (along the rail for crossmember tops), and Z is up. This is the same frame as `parts/darko.ts` and `parts/voltra.ts`. See [Rack attachments](#rack-attachments).
- **Materials:** return named `SolidPart`s grouped by material, with `role` from `appearance.ts` (`'source'` for fixed factory colours, `'handle'` for grips and knurl, `'liner'` for rubber and UHMW, `'fastener'` for hardware; use `'frame'` only when the user's rack paint should recolour it). Set `color`, `metalness` and `roughness` to match the photos.
- **Budget:** keep each part under about 80k triangles and under about 1.5 s to build its defaults. Use cylinder segments of 24–48; small bolts can use 12–16.
- Every solid must be non-empty, `status() === 'NoError'` and positive volume, for **every** param option (test the extremes and the defaults).

## Tests (required)

Write `rack-generator/<family>.test.ts` using `node:test` (see `powerblock.test.ts`). It must check that:

- every entry builds valid closed solids for defaults and for the first, middle and last value of every param
- the build bounding box matches the footprint (floor), face (wall) or envelope (hang)
- the key published dimensions come out of the build within a stated tolerance (overall L×W×H, bar length, shaft diameter, pad height, etc.)
- `validateFloorParams`, `coerceFloorParams` (or their hang/wall equivalents) accept defaults and reject junk

Also run the registry contract tests, which every entry must pass: `npx tsx --test rack-generator/floor-registry.test.ts rack-generator/hang-items.test.ts rack-generator/wall-items.test.ts rack-generator/rack-registry.test.ts rack-generator/placement-proposals.test.ts rack-generator/attribution.test.ts rack-generator/vendor-catalog.test.ts`.

## Rack attachments

Brand J-cups, safeties, rollers, pads, dips, landmines, lever arms, band pegs and digital or cable mounts are **rack parts**. They persist as ordinary `doc.accessories`, so pairing, face and hole moves, 3D moves, undo, save and reload, swap, collisions, GLB and 3MF all work with no extra code. Like Darko and VOLTRA, rack parts **print** in the 3MF, with their vendor credit in the print report. A new rack attachment needs exactly two files: your family's `rack-parts/<family>.ts` (list the entry in `PARTS`) and `parts/<family>.ts` (`rackDefinition(PART, build)`). The proof entries are `rack-parts/rogue-band-pegs.ts` (through-pin) and `rack-parts/rep-leg-roller.ts` (param-dependent bolt pattern, handed pair, autoFit), with builders beside them in `parts/`.

```ts
export const MY_JCUP = defineRackPart({
  id: 'brand-product', name: 'Brand J-Cup', title: 'Brand J-Cups', noun: 'j-cup', section: 'J-cups & safeties',
  description: '… Independent reconstruction; Brand trademarks belong to Brand.',
  params: [{ key: 'hardware', label: 'Hardware', default: 1, options: [0, 1], format: v => ['5/8 in pin', '1 in pin'][v] }],
  vendor: { vendor, url, credit, trademark, reconstruction },
  mount: {
    targets: ['upright'],            // or ['crossmember-top'] (Darko Anchor rail stations), or both
    holes: [0],                      // station offsets from the target hole: [0, -2] = two-bolt plate, p => … by params
    mainStations: true,              // refuse bench-zone half holes (default: true when more than one hole is used)
    pin: p => p.hardware ? PIN_1IN : PIN_5_8IN,  // rack-crossing pin/bolt diameter vs the bore (PIN_1IN = 24.8, PIN_5_8IN = 15.5)
    pinAxis: 'normal',               // 'normal' through the face, 'across' for a sleeve's transverse pin
    extent: { below: 150, above: 50 },  // mm below/above the target hole centre → hole limits
    faces: ['front', 'back', 'left', 'right'],
    validate: (rack, params) => { /* extra fit rules; throw user-facing messages */ },
  },
  bodies: p => [{ min: [-38, p.upright / 2 + 10, -120], max: [38, p.upright / 2 + 180, 30] }], // working bodies, not the pin
  pair: { default: true }, handed: false,
  cradles: { kind: 'working', label: 'Brand J-Cups', slots: p => [{ point: [0, p.upright / 2 + 60, 40], axis: [1, 0, 0] }] },
  placement: { height: 1215, face: 'front' },     // or p => … ; face may be 'inside' / 'outside' (side faces)
  autoFit: rack => ({ hardware: rack.holeDiameter < 20 ? 0 : 1 }),   // params for new placements on this rack
  family: 'j-hooks',                               // optional: swap/variant group (default rack:<section>)
});
```

- **Builder context:** builders, `bodies` and cradle `slots` receive the entry params plus `upright` (tube mm), `mountSpacing` (pitch mm), `holeDiameter` and, on the second unit of a `handed` pair, `mirror: 1`, which mirrors the geometry across local X. Offset hole k sits at `z = k * params.mountSpacing`. Never name a param after one of these context keys, and never assume a 75 mm tube or 50 mm pitch.
- **Pairs:** the second unit goes on the matching upright across the rack, and side faces swap (`left` ↔ `right`). On a crossmember top, the second unit goes on the parallel rail.
- **Bodies:** use a few boxes that follow the real pads, arms and cups, and leave out the pin or collar inside the hole. Every hole in `holes` is also checked for shared-slot conflicts with other accessories.
- **Cradles:** give J-cups, spotter arms and bar storage `cradles` so the barbell parks in them like the built-in J-hooks. Two coaxial supports 300 mm or more apart form a cradle. `kind: 'storage'` ranks below working cradles.
- **Tests:** `rack-registry.test.ts` already checks every entry. It builds every param combination (and mirror) on 75 and 76.2 mm tubes, and checks the triangle and time budgets, that the solids stay inside `extent`, and that `bodies` sit inside the build and outside the tube. It also checks catalog, section and attribution, placement on the stock rack, the pair default, the mount count, the JSON round trip, allowed faces, removal with the upright, and strict params on the BOS, REP and Hydra profiles. `placement-proposals.test.ts` sweeps every accessory for a collision-free proposal. Your family test adds the published dimensions (as `rack-attachments.test.ts` does) and any fit rules, such as the bore and pitch.
- **Screens:** `scripts/shoot-part.ts` renders the part in the viewer with the default 75 mm context. Also check it mounted in the builder (`/builder`, click the sidebar card, **Place**), then try the face select, the hole number, **Matching pair** and undo.

## Worktree setup

```sh
ln -s "/Users/wesbos/3d-printing/Gym Equipment/node_modules" node_modules   # once, in your worktree root
npm run typecheck
npx tsx --test rack-generator/<family>.test.ts
```

The full `npm test` takes about 3 minutes and many agents share this machine, so run it **once**, right before merging. Iterate with your own test file plus the registry tests.

## Git, PR and merge protocol

1. Start from the latest main: `git fetch origin && git checkout -b catalog/<family> origin/main`. Work on branch `catalog/<family>` in your worktree. Make small, descriptive commits, ending each commit message with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
2. Commit 2–4 of your best screenshots (converted to JPEG: `sips -s format jpeg -s formatOptions 70 in.png --out out.jpg`) to `docs/evidence/issue-<N>/`.
3. Push and open a PR: `gh pr create --title "<Add …>" --body …`. The body lists each product with its source URL, the published dimensions matched, known estimates, and the screenshots (link the committed evidence files with `https://github.com/wesbos/gym-equipment/blob/<branch>/docs/evidence/…?raw=true`). Include `Closes #<N>` and end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
4. **Merge it yourself:**
   ```sh
   git fetch origin && git rebase origin/main
   npm run typecheck && npx tsx --test rack-generator/<family>.test.ts <registry tests above>
   npm test                      # once, full suite
   git push --force-with-lease
   gh pr merge --squash          # not --delete-branch: main is checked out in another worktree
   git push origin --delete catalog/<family>
   ```
   If the merge is refused because main moved, repeat the fetch, rebase and push, then merge again. If a rebase conflicts in a file you didn't own, keep both sides' additions.
5. Never deploy. Never push to `main` directly. Never edit another family's files.
