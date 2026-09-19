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

Every family already has **slot files** wired into the registries and `catalog.ts`. **Only edit your family's files**; never edit `floor-registry.ts`, `hang-registry.ts`, `wall-registry.ts`, `catalog.ts` or `BuilderPage.tsx`. That's how 20+ PRs merge without conflicts.

| Kind | Metadata (main bundle, no Manifold imports) | Builder |
|---|---|---|
| Floor item (free-standing) | `rack-generator/floor-parts/<family>.ts` → `export const PARTS = [A, B, …] as const` | `rack-generator/parts/<family>.ts` → `export const definitions = [floorDefinition(A, buildA), …]` |
| Hang item (hangs from a pegboard hook) | `rack-generator/hang-parts/<family>.ts` | `rack-generator/parts/<family>.ts` with `hangDefinition` |
| Wall item (mounted on a gym wall) | `rack-generator/wall-parts/<family>.ts` | `rack-generator/parts/<family>.ts` with `wallDefinition` |

Put tests in `rack-generator/<family>.test.ts` and research notes in `rack-generator/research/<family>.md`. If you need more files, prefix them with your family slug (e.g. `parts/ergs-flywheel.ts`).

- **One catalog entry per product**, each with its own `id`, `title`, `vendor` attribution and `section`. Share one parametric builder across a family's products when they're structurally similar (e.g. all hex dumbbells). Real variants of one product (weights, lengths, colourways, leg heights) are **params** on that entry, not separate entries.
- **IDs:** `<brand>-<product>` in kebab case, e.g. `rogue-echo-bike`, `cap-rubber-hex-dumbbell`. Grep first so you never reuse an existing id.
- **Sections:** set `section` to one of `FLOOR_SECTIONS` / `HANG_SECTIONS` / `WALL_SECTIONS` in `rack-generator/catalog-sections.ts`. The sidebar and `/library` group by it automatically.
- **Vendor attribution is required:** `{vendor, url, credit, trademark, reconstruction}`, like `floor-parts/powerblock.ts`. `reconstruction` states honestly what is published and what is estimated. Descriptions end with "Independent reconstruction …; <Brand> trademarks belong to <Brand>."
- **Params** are numeric selects: enums are 0/1/… with `format`, and `options` may depend on earlier params. Keep defaults to the most common real configuration.

## Geometry conventions

- Millimetres, Z up, built with Manifold (`manifold-3d`). Follow the `owned` list and `try/finally` delete pattern in `parts/powerblock.ts`: every intermediate Manifold/CrossSection is deleted, and only returned solids survive. Leaking WASM memory breaks the builder.
- **Floor parts:** origin on the floor at the footprint centre. The bounding box of all returned solids must match `footprint` (width along X, depth along Y) and sit at z ≥ 0. Test this, as `powerblock.test.ts` does.
- **Hang parts:** origin at the carabiner anchor, X along the wall, −Y out of it, Z up. `hook: 1` adds the peg pose. See `hang-part.ts` and `parts/cable-attachments.ts`.
- **Wall parts:** origin at the face centre on the wall surface, X along the wall, −Y out of the wall. See `wall-part.ts`.
- **Materials:** return named `SolidPart`s grouped by material, with `role` from `appearance.ts` (`'source'` for fixed factory colours, `'handle'` for grips and knurl, `'liner'` for rubber and UHMW, `'fastener'` for hardware; use `'frame'` only when the user's rack paint should recolour it). Set `color`, `metalness` and `roughness` to match the photos.
- **Budget:** keep each part under about 80k triangles and under about 1.5 s to build its defaults. Use cylinder segments of 24–48; small bolts can use 12–16.
- Every solid must be non-empty, `status() === 'NoError'` and positive volume, for **every** param option (test the extremes and the defaults).

## Tests (required)

Write `rack-generator/<family>.test.ts` using `node:test` (see `powerblock.test.ts`). It must check that:

- every entry builds valid closed solids for defaults and for the first, middle and last value of every param
- the build bounding box matches the footprint (floor), face (wall) or envelope (hang)
- the key published dimensions come out of the build within a stated tolerance (overall L×W×H, bar length, shaft diameter, pad height, etc.)
- `validateFloorParams`, `coerceFloorParams` (or their hang/wall equivalents) accept defaults and reject junk

Also run the registry contract tests, which every entry must pass: `npx tsx --test rack-generator/floor-registry.test.ts rack-generator/hang-items.test.ts rack-generator/wall-items.test.ts rack-generator/attribution.test.ts rack-generator/vendor-catalog.test.ts`.

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
