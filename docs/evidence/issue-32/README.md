# Suggested placement (#32)

Verified 2026-09-17 using browser session `gym-wave2-suggestions`, local port 5312.

- Live reproduction: https://bos-strength.wesbos.workers.dev/builder. Landmine selection exposed dots but no immediate ghost. Zero targets did **not** reproduce on this deployed version. The live build is older than current TypeScript main.
- Current domain adapter: 576 validation-clean single mounts (four faces × four posts × holes 1–36). Source rack studs are Z20/Z170 (150 mm apart), local outward +X, 50 mm required pitch. No source geometry change was justified. Suggestion uses front-left outside, lower stud at 165 mm, upper stud at 315 mm, and mirrored right post; working-body envelopes are clear.
- Local landmine: first catalog click shows ghost without editing the rack. Place and second catalog click independently verified adding one paired accessory (14 → 16 physical parts); one Undo returns to 14. Moving pointer to a different dot changed the ghost to front-left/front/hole 16; Place and Undo worked.
- Default browser catalog sweep: all 28 cards produce a proposal or explicit no-fit. Upright explains all posts are already present; spherical pull-up reports its working-body overlap with the existing crossmember. Other 26 cards produced proposals, including frame replacements. No selection during sweep committed a part.
- Six-post storage: paired long pins suggested on the rearmost graph posts, not the original rear IDs. Screenshot predates the final human-readable label refinement from `upright 1` to `rear left`.
- Full geometry is built only for the selected ghost. Pure proposal search checks at most 64 ranked transform/envelope candidates; it does not run Manifold. Existing swap render queue retains one in-flight/one latest pending preview.

These conservative body envelopes exclude intended mounting collars and are a placement aid, not a solid/solid manufacturing clearance certificate. If the bounded search exhausts its budget, the UI says that 64 best positions were checked; it does not claim exhaustive geometric impossibility. Specialized rail/span restrictions remain intact.

## Profile/default review follow-up

Structure proposals now call `swapCandidate`, retaining the shared profile-valid angled rise. `placementMounts` supplies the same explicit safety pin defaults used by `proposalAt` to validation (`getMounts` has an additive optional third numeric-params argument). REP-4000/5000 accessory sweeps are covered by tests. The PR-4000 browser check placed a 203.2 mm angled rise, undid it, and placed a paired pin-and-pipe safety with 15.075 mm pins and no collision warning (screenshot attached).

`placementTarget<T>` removes only known renderer metadata and preserves the rest of the typed domain target, including future discriminants. Moves call the domain `moveAccessory` adapter; non-upright pairs are left to domain validation. A metadata regression includes `kind`, `connectionId`, `station`, `side`, and an unknown nested extension. Actual vendor catalog/`pairTarget` validation remains to be exercised after unmerged PR36 lands; no claim of that integration yet.
