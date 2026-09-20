# Sleds, battle ropes, plyo boxes & jump rope (issue #117)

Sources checked 2026-09-19. Twelve catalog entries in `floor-parts/conditioning.ts` (section **Cardio**), built by
`parts/conditioning-sleds.ts` (five sleds) and `parts/conditioning-soft.ts` (three ropes, three boxes, one jump rope) on a
shared kit (`parts/conditioning-kit.ts`). Swept geometry — rope bodies, cable, bent tubes, tyres — comes from the pure
modules `floor-parts/conditioning-geometry.ts` / `conditioning-layouts.ts`: the metadata takes those exact vertices as the
footprint and the builders turn the same meshes into Manifolds, so bounds and footprint cannot drift. Brand names and
numbers are typeset in the bundled Helvetiker Bold (no logo artwork). Photos were downloaded to the scratchpad and viewed
as contact sheets and full-size close-ups; the counts below are the images actually reviewed.

Frame: X across, Y along the part, Z up, origin on the floor at the footprint centre. Sleds: push poles at +Y (Rogue,
Titan); the TANK's nose housing is +Y. Loaded plates use `buildPlateStack` on the horn (axis +Z from the deck top); the
`load` options are filtered to stacks that fit each horn's loadable length.

## Torque TANK M1 push sled — `torque-tank-m1-push-sled`
- https://www.torquefitness.com/products/tank-m1-push-sled (+ `.json` gallery), assembly guide XTTM1-RPH-103 Rev D
  (`/cdn/shop/files/XTTM1-RPH-103-Rev-D.pdf`), sales flyer, GGR best-weight-sleds review photos.
- Published: product page 45.1 × 31.9 × 37.5" (78 lb); the guide's dimensioned top/side views 53.9 × 31.8 × 37.7"
  (1370 × 808 × 957 mm, 86 lb) with the push/pull bar rotated forward; BOM: 10" rear wheels, L/R push handles in receiver
  tubes on the rear frame, push/pull bar with spring-pin positions, optional console/dumbbell cradles/wheelbarrow handles.
- Measured on the 300 dpi guide render (21.4 px/in): rear axle z 5.3", wheel Ø 10.4" × 3.1"; crossbar 3.1" deep × 24.6"
  long; receivers ±5.85" off centre; rails 9.45" outer, top 6.07", bottom 3.6"; housing from 18.5" to 40" ahead of the axle,
  top 12.6"; front (Mag-Force) wheel ≈ 9.7" at 35.3"; horn Ø 1.72" at 8.35", top 12.5"; bar pivot at 30.75" / z 7.4",
  hoop 14.8" outer, legs ≈ 18" + 4.7" end, tow D-ring to 48.7".
- Model: bar pose param — *High push* (legs 70°, matches the 45.1" catalogue length: build 1140 mm) and *Low push/pull*
  (legs 40.5°, matches the guide's 1370 mm: build 1370). Width 808, height 957 (grip tops) exact.
- Estimates: tube Ø (posts 41 mm, bar 38 mm), Y-handle bend points and grip angles (from the guide's side/top views and
  photos: upper grips splay out and forward, lower grips point inward toward the nose), housing contour, tread pattern
  (22 staggered lugs), graphite panels and orange T-handle/caps from photos. Horn loadable 164 mm (fits up to 4 × 45 lb or
  one 25 kg bumper). Console, cradles and straps not modelled.
- Photos (21): 19 vendor gallery images (studio 3/4, garage, driveway, wall storage plan view, console, dumbbell cradle
  close-ups) + GGR wall-mount and in-use shots; guide pages 1–8.

## Rogue Slice Sled — `rogue-slice-sled`
- https://www.roguefitness.com/rogue-slice-sled. Published: 27.5 × 22.75 × 37.25" (with handles), 65 lb, 0.25" laser-cut
  and formed steel, 14" loadable post that bolts on / folds flat, 16' strap + carabiner, laser-cut ROGUE on each side.
- Model: tapered runner skids following the RA1266 replacement-runner outline (narrow front, wide rear), one base plate
  with rear window, post slot and front strap tab; tall-rear/low-front runner fins with ROGUE cut through, folded top
  ledges, rear pole sleeves + 1.9" poles; clevis-mounted weight post with a *post* param (up / folded flat — folding
  forces an empty horn).
- Estimates: fin heights 118 → 14 mm, post 235 mm from the rear, pole Ø 1.9" (Rogue's sled standard), ledge size.
- Photos (9): hero with strap, two studio 3/4 views (post up/down), folded-post close-up, three in-use pushes/drag,
  catalogue thumbnail, RA1266 runner outline.

## Rogue Echo Dog Sled — `rogue-echo-dog-sled`
- https://www.roguefitness.com/rogue-echo-dog-sled. Published: 36.5" long (17" loadable), 25" wide, 37.5" tall with
  uprights and plastic caps, 87 lb, 0.25" plate steel base cut from a single sheet, 450+ lb capacity.
- Model: formed runners (skid with 45° upturned tips + outer wall), bolted saddle with sloped side flanges carrying
  ROGUE cut through and four bolts each, deck with twin windows around a waisted spine and a front carabiner slot, four
  corner sleeves, rear poles, 17" horn.
- Estimates: wall 2.25", deck 4.25", tip rise 46 mm, saddle 23" long, sleeve 2.375" × 3".
- Photos (11): studio 3/4 and side, top view of the saddle, flange close-up, sandbag hero, three loaded heroes, two
  in-use pushes, GGR header.

## Titan Pro Sled System — `titan-pro-sled-system`
- https://titan.fitness/products/pro-sled-system (+ core unit 401816). Published (dimension graphic): 40 × 24", 39" to
  the pole tops, 37" poles, 48 mm poles and horn, 17" loadable, 102 lb, 750 lb capacity; 2" hole spacing, UHMW liners,
  rubber divider disc, two poles. (Manual link 403s.)
- Model: shared tube-runner builder with Rogue's Dog Sled: 2 × 3" runners with 45° ends, UHMW shoes under the ends with
  bolt heads, TITAN laser-cut into the outer wall between two dots, holes at 2", sleeves at all four corners, poles in the
  rear pair, deck with carabiner tab, rubber disc under the horn.
- Estimates: tube 2 × 3", shoe 3" wide × 250 mm, deck 19 × 18.5", disc Ø 200 × 10.
- Photos (12): studio 3/4, four in-use (push, high/low bar, lawn boy, rope pull), horn/disc, sleeve and shoe close-ups,
  6-way attachment grid, dimension graphic.

## Rogue Dog Sled 1.2 — `rogue-dog-sled`
- https://www.roguefitness.com/rogue-dog-sled (XX2044). Published: 40 × 24 × 39.5", 103 lb, 2 × 3" 11 ga + 0.25" plate,
  4" skid width, 1.9" handles, removable push poles, attachment holes in the skis, laser-cut carabiner hole.
- Model: tube runners on 4" skids with upturned 45° ends, ¾" holes at 2" pitch (clear of the logo and deck bolts), white
  ROGUE / MADE IN THE U.S.A. prints, two deck bolts per side, sleeves inside each end, 1.9" poles in the rear pair.
- Estimates: horn loadable 16" (photo scale), deck 18 × 18.5", sleeve 2.375" OD × 64 mm above the tube.
- Photos (9 + a 6-up grid): dark studio hero, dimensioned hero, attachment grid, runner/sleeve close-up, four in-use.

## Battle ropes — `amazon-basics-battle-rope`, `rep-sleeve-battle-rope`, `titan-poly-dacron-battle-rope`
- Amazon Basics: https://www.amazon.com/dp/B072Z2ZTLJ (1.5" × 30 ft, 15.8 lb) and B072Z5N674 (2" × 30 ft, 12.57 kg);
  100% poly dacron 3-strand, orange/yellow tracer line, heat-shrink end caps. Photos (9 + 2 GGR).
- REP: https://repfitness.com/products/sleeve-battle-rope — red/blue/black × 1.5"/2" × 30/50 ft (BR-1530 … BR-2050,
  8.5–23.1 kg). Nylon sleeve over the rope, moulded black rubber REP handles. Photos (16 + GGR).
- Titan: https://titan.fitness/products/black-poly-dacron-battle-ropes — 30/40/50 ft × 1.5"/2"; 30 ft × 1.5" 15 lb,
  30 ft × 2" 24.7 lb (graphics). Glossy heat-shrink TITAN grips. Photos (48: 8 per variant) + GGR.
- Model: one swept mesh per rope. Twisted ropes use a three-lobed section (V grooves) rotating once per lay (3.3 × Ø);
  the sleeve rope uses a round section with soft bunching rings. Grips are separate glossy sweeps (heat-shrink hugs the
  strands; REP's rubber handle is round with a rounded tip). Amazon's tracer is a dashed yellow yarn on one strand crest.
- Pose param (issue: coiled vs laid out): *Coiled (stacked)* — helix of Ø √(L·D / 1.2π) (height ≈ 1.2 × width, like the
  vendor coils), tails tangent at floor and top; *Rolled flat* — Archimedean floor spiral (Amazon's hero shot);
  *Anchored, laid out* — U-turn of radius 110 mm round the anchor with the legs spreading to 600 mm at the hands.
- Estimates: grip lengths (Amazon 205 mm, REP 235 mm, Titan 185 mm), grip Ø (+3.5 mm heat-shrink, +12 mm rubber),
  sleeve thickness (+6 mm). Amazon's newer listing mentions an Oxford mid sleeve that no photo shows; not modelled.

## Plyo boxes — `rep-3-in-1-soft-plyo-box`, `titan-3-in-1-soft-foam-plyo-box`, `rogue-games-box`
- REP: https://repfitness.com/products/3-in-1-soft-plyo-boxes — Small 16 × 18 × 20", Medium 16 × 20 × 24",
  Large 20 × 24 × 30" (PB-5100-20/-24/-30); wood core, soft foam, thick vinyl, zip cover. Photos (24).
- Titan: https://titan.fitness/products/3-in-1-soft-foam-plyometric-box-20-in-24-in-30-in — 20 × 24 × 30", 16 lb,
  350 lb capacity, firm foam core, slip-resistant vinyl. Photos (10 + GGR).
- Rogue Games Box: https://www.roguefitness.com/rogue-games-box (RA0368; flat pack RF0253) — 30 × 24 × 20", 56 lb,
  A/C plywood, CNC-machined panels, internal reinforcement. Photos (7 + flat-pack thumbnail + GGR).
- Model: *height* param turns the box onto the face giving 20/24/30" (REP: the size's three dims); the longer remaining
  dimension runs along X. Face graphics follow the vendor rule: each face's number reads upright when that face's up axis
  stands vertical, so the current height reads upright on one pair of sides and the other heights appear rotated.
  REP: rounded (22 mm) vinyl body, 4.5 mm white border 30 mm in, REP / F I T N E S S wordmark, number + arrow + INCH.
  Titan: glossier vinyl, 30 mm edges, TITAN (white) over FITNESS (red), number + outline arrow + inch. Rogue: six ¾"
  panels in three slightly different ply tones so the joints read, burned ROGUE on the four long faces along the 30"
  axis, a 115 × 34 mm hand hole 82 mm from the 20" edge of each 20 × 24" end, one internal cleat.
- Estimates: edge radii, print sizes and positions, hand-hole size/position, ply thickness.

## Rogue PRO jump rope — `rogue-pro-jump-rope`
- https://www.roguefitness.com/rogue-pro-jump-rope (AD0099). Published: stainless handles 25 mm × 5.95", 1 lb each, fine
  full-depth knurl, etched ROGUE end band, 360° bearing swivel, red-coated 5.5 mm heavy cable, 95/100/105/110/115".
- Model: lathed handle (plug band, knurl band 16–96 mm, cone 101–136 mm to a 13 mm neck, black swivel cap, eye), cable
  swept from each swivel down to the floor; pose param *loose loop* (single circle ahead of the handles) or *coiled*
  (three offset turns, gym-bag coil).
- Estimates: cone/neck/eye proportions from the callout photos. Photos (12): 6 rope images + 6 PRO cable-kit images.

## Visual review (renders vs photos)
- Round 1: TANK rear hubs covered almost the whole wheel → deeper tyre section (54 mm) with a recessed zinc rim and boss;
  Echo saddle lettering hidden behind a 57 mm runner wall → wall lowered to 22 mm so ROGUE reads through, as in the side
  photo; Titan bolt heads stood 0.3 mm proud of the footprint → shortened.
- Round 2: 3-strand grooves too faint and grip lettering sunk between lobes → deeper lobes (30 %), labels on the lobe
  crest; plyo height numbers printed as floats → rounded; ply tones spread so panel joints read.
- Round 3: pose variants (flat spiral, laid out, bar forward, post folded, coiled jump rope) checked against the Amazon
  flat-coil, Titan laid-out, TANK guide and Slice folded-post photos. Evidence: `docs/evidence/issue-117/`.
