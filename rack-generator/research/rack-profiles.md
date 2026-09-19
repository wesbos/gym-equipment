# Rack profiles: popular power racks, half racks & squat stands (#130)

Sources checked 2026-09-19. Popularity (gyms owning it) from [Gym Radar](https://gymradar.com/most-owned/rack). Every rack below is a rack-builder **profile** in `profiles.ts` plus curated **starters** (`starters`, surfaced in the sidebar under "<Brand> racks" and generated into `RACK_PRESETS`). Dimensions are stored in millimetres from the published inch values (`inch()`), never rounded to the BOS 50 mm source lattice.

Reference photos (manufacturer galleries plus Gym Radar owner photos, 8–15 per rack) were downloaded to the agent scratchpad and reviewed side by side with builder renders in two rounds; the committed evidence is in `docs/evidence/issue-130/`.

## Frame features added to the builder

The builder had one kind of frame: square 75 mm (or 76.2 mm) posts on the BOS three-hole floor plate. Real racks needed five small, general additions. All are opt-in per profile; generic, BoS and PR-5000 documents build exactly as before (tested).

| Feature | Where | Notes |
|---|---|---|
| Rectangular 2x3 posts | `RackDimensions.tubeDepth`, `profile.tubeDepth` | `tube` stays the face width along X (the 2-inch face points forward, as on the R-3, T-3 and S-2); `tubeDepth` is the Y size. Post centres, mounts, span lengths, extensions and resizing use it. Validation requires it to match the profile. |
| Base styles | `profile.base`, upright builder `baseStyle` | `bolt-down` welded plate (outward / inward / fore overhangs), `foot` flat-foot tube with optional triangle gussets, rubber end caps and rear floor crossbar, `wall` fold-back swing arms with hinge brackets. Posts in one column share one continuous foot: each post draws its half, with open inner ends and capped outer ends. |
| Per-post height | `UprightNode.height` | Half racks with shorter storage posts (HR-2 70″/90″ rear). Beams use the shorter post of their pair; mounts and accessories stop at that post's top. |
| Side-hole stride | `profile.sideStride` | Titan drills side faces every 6 inches on a 2-inch lattice. Side holes, rear beams (flange 50 + 3 × pitch), pull-up plates and side-face mounts snap to that stride. |
| Manufacturer nameplate | `profile-nameplate` frame part, `profile.nameplate` | Rear top beam plus a plain colour plate: Rogue arch, REP panel, Titan/REP badge. No lettering or artwork is reproduced. |

Also: `profile.firstHole`, `wall`, `numbered`, `decal` (a plain five-block vertical word-mark strip on each post's outer side face near the top, e.g. Rogue), `color` (starter powder coat), `storageDepth`, `lowerCrossmembers: false` (flat-foot racks have no low side beams), and flange/pull-up bolt spacing that follows 76.2 mm pitch (PR-1100). Worker params must be positive and ≤ 4000, so colours travel as `prefixR/G/B` = channel + 1 and flags are only present when set.

Accessory limits are unchanged: the BOS J-hooks, safeties and attachments still require 75 mm posts, so on true 2x2/2x3/3x3 profiles only pull-up bars place today. Brand J-cups and safeties for these posts belong to #133 / #131.

## Products

Footprint = outside W × D × H in inches. Hole = diameter, pitch = on-centre spacing.

| Profile | Starter(s) | Tube | Hole / pitch | Published dims used | Base / top |
|---|---|---|---|---|---|
| `rogue-rm-monster-2` Rogue RM Monster Rack 2.0 (138) | RM-4 43″ ★, RM-3 30″, RM-6 43″ + 24″ | 3×3 11 ga | 1″ hardware / 2″, laser numbers front+back | 49″ outside (43″ inside) width; depths 24/30/43″; heights 80.375–108.375″; RM-4 53 × 53, RM-3 40 × 53, RM-6 80 × 53 footprint | bolt-down plates (2″ overhang), red arch nameplate (XM-43N), single pull-up bar XM-431 |
| `rep-pr-4000` REP PR-4000 (75) | existing enumerated presets; 93″ × 30″ featured | 3×3 11 ga (saved docs keep 75 mm) | 5/8″ / 1″ bench zone, 2″ elsewhere, numbers every 5th hole | width 50.8″ outside, depths 16/24/30/41″, 80/93″ | post-style bolt-down plates, centred logo badge |
| `rogue-rml-3` Rogue Monster Lite 3.0 (69) | RML-390 30″ ★, RML-490 43″, RML-690 43″ + 24″ | 3×3 11 ga | 5/8″ hardware / Westside | 49″ W, 24/30/43″ inside depth, 80.375/90.375″, 34/40 × 53 footprint, 76″ RML-690 length | bolt-down plates, plain rear beam |
| `rogue-rml-390f` RML-390F Flat Foot (25) | 92″ × 30″ ★ | 3×3 posts on 2×3 feet | 5/8″ / Westside | 48 × 49 footprint, 92.25″, 30″ inside depth | 48″ feet, triangle gussets, no low beams, single skinny bar |
| `titan-x3` X-3 Bolt Down (42) | 90″ × 24″ ★, 90″ × 36″, 80″ × 24″ | 3×3 11 ga | 11/16″ / Westside front, 6″ side | 42″ inside W, 48″ outside W, 24/36″ inside D, 80/90″, 54″ footprint width, 33″ depth (24″ rack) | bolt-down plates 3″ outward, TITAN badge, 1.25″ + 2″ bars |
| `titan-x3-flat-foot` X-3 Flat Foot (12) | 91″ ★, 82″ | 3×3 11 ga | 11/16″ / Westside, 6″ side | 42 × 30″ inside, 82/91″, 50 × 48 footprint | flat feet, tall gussets, 3 top braces |
| `titan-t3` T-3 (42) | 91″ × 24″ ★, 91″ × 36″, 82″ × 24″ | 2×3 11 ga (2″ forward) | 11/16″ / Westside, 6″ side | 42″ inside / 46″ outside W, 24″ inside / 30″ outside D, 82/91″, 54 × 32.75 footprint | bolt-down plates 4″ outward, badge, 1.25″ + 2″ bars |
| `rogue-sml-1` SML-1 70″ squat stand (33) | 72.25″ ★ | 3×3 posts, 2×3 base | 5/8″ / Westside | 48 × 49 footprint, 72.25″ | two 48″ feet (posts toward the rear) + rear floor bar, triangle plates |
| `rogue-sml-2` SML-2 90″ squat stand (22) | 92.25″ ★ | as SML-1 | as SML-1 | 48 × 49, 92.25″ | + single skinny pull-up bar |
| `titan-t2` T-2 (22) | 71″ ★, 83″ | 2×2 14 ga | 26 mm / 2″ | 42 × 26″ inside, 71/83″, 57 × 50 footprint | feet with rubber caps, rear floor bar at the rear posts, badge |
| `rogue-r3` R-3 (21) | 90″ × 30″ ★ | 2×3 11 ga (2″ forward) | 5/8″ / Westside | 43″ inside W, 24/30″ D, 90.375″, 34/40 × 53 footprint | bolt-down plates, fat/skinny bars, unnumbered |
| `rogue-hr2` HR-2 half rack (19) | 90″/70″ ★, 108″/90″ | 3×3 posts, 2×3 base | 5/8″ / Westside | 48 × 49, 17″ crossmembers, 90/108″ front, 70/90″ rear sticks (92.25/110.25″ overall) | SML base, shorter rear posts, no rear beam |
| `rogue-sm-1` SM-1 Monster squat stand 2.0 (14) | 73″ ★ | 3×3 11 ga | 1″ hardware / 2″ | 73″, 50 × 54 footprint, rubber feet | feet with rubber caps, rear floor bar |
| `rep-pr-1100` PR-1100 (13) | 85″ × 24″ ★ | 2×2 14 ga | 1″ / 3″ | 44 × 24 × 79″ working area, 85″, 58.1 × 48.5 footprint | feet with caps, rear floor bar, badge |
| `rogue-rml-3w` RML-3W fold back (11) | 21.5″ ★, 41.5″ | 3×3 11 ga | 5/8″ / Westside | 43″ inside / 49″ outside W, 21.5/41.5″ inside depth, 90.375″, 59 × 10.125″ brackets | swing arms, hinge brackets, detent pins, pull-up bar |
| `rep-apollo` Apollo half rack (9) | 93″ ★, 80″ | 3×3 11 ga | 1″ / 2″ | 48 × 52.4 footprint, 80/93″, 16″ crossmembers | flat-foot base, silver logo panel |
| `rogue-s-2` S-2 squat stand 2.0 (8) | 92″ ★ | 2×3 11 ga | 5/8″ / Westside | 92″, 48 × 48, 1.25″ + 2″ bars | Monster Lite triangle-plate base |

★ featured in the sidebar. Sources: [RM-4](https://www.roguefitness.com/rogue-rm-4-bolt-together-monster-rack-2-0), [RM-3](https://www.roguefitness.com/rm-3-bolt-together-monster-rack-2-0), [RM-6](https://www.roguefitness.com/rogue-rm-6-bolt-together-monster-rack-2-0), [RML-390](https://www.roguefitness.com/rml-390c-power-rack-3-0), [RML-690](https://www.roguefitness.com/rml-690c-power-rack-3-0), [RML-390F](https://www.roguefitness.com/rml-390f-flat-foot-monster-lite-rack), [R-3](https://www.roguefitness.com/rogue-bolt-together-r-3), [HR-2](https://www.roguefitness.com/rogue-hr-2-half-rack), [SML-1](https://www.roguefitness.com/sml-1-rogue-70-monster-lite-squat-stand-1), [SML-2](https://www.roguefitness.com/sml-2-rogue-90-monster-lite-squat-stand), [SM-1](https://www.roguefitness.com/rogue-sm-1-squat-stand-2-0), [S-2](https://www.roguefitness.com/rogue-s2-squat-stand-2-0), [RML-3W](https://www.roguefitness.com/rogue-rml-3w-fold-back-wall-mount-rack), [X-3](https://www.titan.fitness/products/x-3-series-bolt-down-power-rack-90-24), [X-3 Flat Foot](https://www.titan.fitness/products/x3-series-flat-foot-power-rack), [T-3](https://www.titan.fitness/products/t-3-series-power-rack-91-24), [T-2](https://www.titan.fitness/products/t2-series-power-rack), [PR-4000](https://repfitness.com/products/pr-4000-rack-builder), [PR-1100](https://repfitness.com/products/pr-1100-power-rack), [Apollo](https://repfitness.com/products/apollo-rack-builder); owner photos from the matching Gym Radar item pages.

Tests (`rack-profiles.test.ts`) build every starter frame and check the outside footprint against the table above (±0.6″, ±1.1″ where gusset plates or caps stick out), heights to 0.05″, inside width/depth from post centres, 2x3 orientation and Westside holes by ray cast, Titan side stride, foot continuity, stands, wall arms, short rear posts, nameplates and the legacy contract.

## Estimates (not published)

- **Hole diameters:** Rogue Monster Lite / Infinity and Titan 5/8″-hardware racks use 11/16″ (Titan publishes 11/16″; Rogue's is assumed equal). Rogue Monster 1″ hardware: 1-1/16″.
- **First hole:** 2.5″ on bolt-down racks, 4″ (5″ SM-1, PR-1100) above the floor on foot bases — photos show the first holes just above the plates/gussets.
- **Westside zone:** stations 7–22 (≈ 16.5–46.5″) for Rogue Monster Lite, R-3, S-2 and Titan, by analogy with the existing PR-4000 estimate; vendors only say "through the bench and clean-pull zone". Westside holes are front/back only; side faces keep 2″ (Titan 6″).
- **Bolt-down plates:** overhangs derived from published footprints (Rogue 2″ each way; Titan X-3 3″ out / 1.5″ fore, T-3 4″ / 1.375″; R-3 3″ / 2″; PR-4000 2.5″ / 0.5″ from photos), 3/8″ thick, two anchor holes per overhang.
- **Feet:** 2x3 laid flat (3″ wide × 2″ tall) for Rogue ML stands, HR-2, RML-390F, X-3 FF and Apollo; 2x2 for T-2 and PR-1100. Post position on 48″ Rogue feet, measured from the S-2/SML dimension photos: posts toward the rear (29″ of foot in front, 16″ behind) with the rear floor crossbar 3″ in from the rear ends. HR-2: front posts 19.5″ from the front, rear posts 17″ behind them (published crossmember), 5.5″ of foot behind with the crossbar at the end. SM-1: posts centred on 50″ feet, crossbar 8″ behind the posts, rubber wedges at both ends. RML-390F and X-3 FF 6″ each end (48″ foot − 36″ outside depth). T-2 10″, PR-1100 10.25″, Apollo 13″ each end (footprint − outside depth, split evenly). Gussets: 9″ × 4″ (Rogue ML), 10″ × 5″ (SM-1), 14″ × 5″ (Titan FF), 1/4″ plate.
- **SM-1:** published 50 × 54 footprint; inside width 43″ (Monster crossmember) and 3×3 feet are estimates, so only depth and height are tested.
- **RML-3W:** arm centres 13″ and 65″, 3×3 arms, 1.5″ channel brackets inside the published depth; shown unfolded. Rogue's own figures disagree slightly (41.5″ inside depth vs 43.75″ from the wall).
- **Pull-up bars:** 1.25″ skinny and 2″ fat (published for R-3, S-2, Titan); the second bar of a fat/skinny pair hangs 6″ lower. The PR-1100 multi-grip arch is shown as a straight 1.25″ bar (the multi-grip plate needs the BOS 50 mm lattice).
- **Colours:** Rogue satin black `#1c1d1f`, Titan black `#18191b`, REP metallic black `#303236`; Rogue nameplate red `#c8102e`, REP logo silver `#b8bbbe`–`#b9bcbf`, Titan badge white with a red accent. Other published colourways stay available through the paint picker.
- **PR-4000 tube:** REP now lists 3×3 uprights (earlier profile note said 2×3 treated as square); stored documents keep the 75 mm tube so they still validate and J-hooks still fit.

## Not shipped

- **Fringe Sport The Dane 2.0 (23):** a half rack fused with a dual-stack functional trainer; without the stacks, pulleys and towers it is not recognisable. It belongs with rack-mounted cable systems / functional trainers (#136, #122).
- **Fitness Reality 810XLT power cage (11):** no manufacturer page or spec table could be reached (fitnessreality.com now redirects to an unrelated catalogue), and retail listings were not accessible.
- **Texas Strength Systems Combo Rack (10):** a competition bench/squat combo with hand-jack adjusted hooks and a drop-in bench, not a hole-lattice rack; it fits better as a floor item.
- **Fray Fitness Savage Series (10):** the manufacturer domain no longer hosts the store and no spec table was found; only a handful of owner photos exist.
