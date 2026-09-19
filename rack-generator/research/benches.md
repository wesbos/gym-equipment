# Benches family (issue #114): Rogue, Ironmaster, Freak Athlete and others

Sources checked 2026-09-19. Every model is an independent Manifold reconstruction from published dimensions, manuals and
photos; no manufacturer CAD, meshes or logo artwork. Dimensions are converted at 25.4 mm/in and live in
`floor-parts/benches-specs.ts` (pure data shared by metadata, builders and tests). Local axes: y runs from the front tip
(seat/handle end) to the head end, z up; builders shift by −L/2 so the origin is the footprint centre.

Shared mechanism for the ladder benches (`parts/benches-adjustable.ts`): the back pad hinges about a pivot just behind its
front edge at pad-bottom height (offset ≥ pad thickness − gap so the pads never overlap at 85°); a fixed-length support
link from the back rail lands on a ladder station solved as a circle/line intersection for every published angle; the
link length is the tightest setting plus slack, so every station is a real pose. Seats hinge near their rear edge and use
either a second link onto notched plates on the front leg (Rogue, PRIME, Major) or a sundial arc plate with a pop pin
(Freak Athlete, APEX, Titan). Footprints are exact bounding boxes: fixed frame extents plus analytic sweeps of attachments
(rollers are circles, round tubes are ball-jointed, block pads are rounded on every edge). Tests check all of this.

## Ironmaster Super Bench PRO V2 (84 owners) + attachments
- [Product page](https://www.ironmaster.com/products/super-bench-pro-v2/), [PRO V2 manual](https://www.ironmaster.com/mm5/graphics/00000001/Super%20Bench%20PRO%20V2%20manual.pdf)
- Attachments: [Crunch Situp](https://www.ironmaster.com/products/crunch-situp-attachment/) ([manual](https://www.ironmaster.com/mm5/graphics/00000001/Crunch%20Situp%20Instructions%209-24-2024.pdf)), [Leg Attachment PRO](https://www.ironmaster.com/products/leg-attachment-pro/) ([manual](https://www.ironmaster.com/mm5/graphics/00000001/woo/2019/03/SB-PRO-Leg-Att-4-12-2021.pdf)), [Preacher Curl Pad](https://www.ironmaster.com/products/preacher-curl-attachment/), [Bar Dip Handles](https://www.ironmaster.com/products/bar-dip-handles-for-super-bench/), [Seated Press Pad](https://www.ironmaster.com/products/seated-press-pad-for-super-benchpro/)
- Photos reviewed (11 + 10 attachment): product shot, 3Q incline showroom, pad detail, "V2 updates" side view with labelled ring/seat/handle/wheels, model incline 85°, vertical storage, handle lift, plus Crunch, Leg PRO, Preacher, Dip (with measurement drawing), Seated Press (2 views), decline and preacher lifestyle shots.

| Published | Value | Model |
|---|---|---|
| Overall length | 47 in | 1194 mm footprint (foot caps to wheels) |
| Feet | 12.5 in seat foot (handle), 21 in head foot (wheels) | 318 / 533 mm |
| Flat height | 17.2 in | 437 mm pad top |
| Pad | 44 × 12.25 / 10.25 × 2.5 in | dual-width pad: 300 mm narrow section, 90 mm taper |
| Angles | 0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 85° | `backrestAngle`; notches cut into the stainless ring |
| Incline seat | 9.5 × 9.25 / 5.25 in, plugs in from the side, 3 receivers | `inclineSeat` 0–3 |
| Crunch Situp | C frame, large + small roller pairs, handle, 6 locator holes | rollers 127 / 100 mm (est.) |
| Leg Attachment PRO | 4 × 7 in rollers, 12.5 in Olympic sleeve, **10° only**, support foot on floor | `backrestAngle` options collapse to [10] |
| Preacher Curl Pad | 12 × 24 × 2 in pad, 3 angle holes, twin bar hooks | fixed at the middle hole (−45°) |
| Bar Dip Handle | 20 → 25 in c-c, 9.5 in grips, 1.5 in, 50–52.5 in off floor | test checks 49–53.5 in at 85° |
| Seated Press Pad | 3 × 10.5 × 18 in, 5° recline, top 21 in above pad, 10 in in from end | exact in the geometry data |

Estimated: pivot (y 340, z 360 mm) chosen so the seat end clears the spine at 85° as in the vertical-storage/85° photos;
post position (372 mm from the seat-end face) from the side view; ring radii 168/214 mm, lever at 285° on the post;
spine 64 × 51 mm at mid-foot height; wheels 50 mm; attachment tube paths traced from the product photos. The Crunch Situp's
height holes and the preacher's angle holes are represented but not parameterised. Ring numbers are etched ticks (no text).

## Ironmaster Super Bench (original) (22)
- [Product page](https://www.ironmaster.com/products/super-bench/), [manual](https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/09/Super-Bench-Manual-7-28-2015.pdf); 4 photos + manual drawings.
- Published: 44 × 18.75 × 20 in flat, 41 in frame footprint, 44 × 10 × 3 in pad, same 11 angles, seat heights 12/14/16 in, M10 foot bolts.
- Modelled: equal 18.75 in feet, half-ring lock (lever at 262°), 3 side receivers near the seat end, Textured Black or Hammertone Gray.
  Leg Attachment PRO is excluded (Ironmaster: not compatible with the original bench). Pivot/post position estimated.

## Freak Athlete ABX (36) + Leg Developer (52)
- [ABX](https://freakathlete.co/products/abx) (Shopify JSON images), [ABX Leg Developer](https://freakathlete.co/products/abx-leg-developer-attachment), [Shredded Dad review](https://shreddeddad.com/freak-athlete-abx/); 7 ABX + 8 Leg Developer images.
- Published: 51.4 × 25.2 × 17 in, 96 lb, 11.8 in pads, front foot 11.75 in, rear 25.5 in, back 0/15/22/30/37/45/52/60/67/75/85°, seat 0/10/20/30/40°, zero gap, fold-down headrest, attachment port with pop pin + tension knob.
- Estimated: seat 330 mm (tapered 300 → 250 mm front), back 640 mm, headrest 240 mm (fit inside the published 51.4 in);
  white ladder plates span the spine; sundial seat (R 200 mm). The Leg Developer is modelled as the ABX version on the front
  port with its own U base and wheels (reach 470 mm, 4 in rollers — estimates). GymRadar's "Leg Developer Attachment"
  count may include the Hyper-mounted version; the bench-mounted ABX variant is what fits this bench.

## Rogue Adjustable Bench 3.0 (52) and 2.0 (35)
- [AB 3.0](https://www.roguefitness.com/rogue-adjustable-bench-3-0) (spec table), [GGR review](https://www.garagegymreviews.com/rogue-adjustable-bench-3-review), [BarBend review](https://barbend.com/rogue-adjustable-bench-3-0-review/); 26 images (9 Rogue incl. colourways/pad cross-section, 12 GGR, 5 BarBend).
- AB 3.0 published: 3×3 in 11-ga; back 0/15/30/37.5/45/52.5/60/67.5/75/85°; seat 0/15/30°; pad 17.5 in flat; 11 in textured foam (11.25 in vinyl); 52 in overall pad; 56.5 × 24.75 in base; 1 in gap; wheels + handle; built-in vertical storage; black or brushed stainless adjustment plates (`plates`) and 9 MG colours (`color`).
- AB 2.0: [Rogue accessories page](https://www.roguefitness.com/rogue-adjustable-bench-2-0) (discontinued), [Two Rep Cave review](https://www.tworepcave.com/9402/rogue-adjustable-2-0-bench-and-legend-3-way-bench-review/), [Garage Gym Experiment](https://garagegymexperiment.com/2021/04/27/rogue-adjustable-bench-2-0-review/); 20 images. Published: 2×3 11-ga, 6 back positions 0–85°, 2 seat positions (flat / up), 17.5 in, 11.25 × 52 in pad, 24.5 in rear legs, "virtually no gap", plastic-lined U handle, wheels.
- Estimated: seat 356 mm / back 940 mm split; AB 2.0 length 56 in, its intermediate angles (15/30/45/60) and 15° seat.

## Rogue Flat Utility Bench 2.0 (51), Monster Utility Bench 2.0 (48), Thompson Fat Pad (46)
- [FUB 2.0](https://www.roguefitness.com/rogue-flat-utility-bench-2-0): 47 × 14 in footprint, 18 in pad height, 12 × 2.5 in pad, single-piece notched/formed 2×3 11-ga frame, angled legs, rubber feet. 6 images. Estimated: pad length 46 in, leg rake.
- [MUB 2.0](https://www.roguefitness.com/monster-utility-bench-2-0-mg-black): 3×3 11-ga, 47.375 × 26.25 in, single-column front foot, front handle (MG black / stainless knurled / short), rear wheels, UHMW cap, 3/16 in R gussets, heights 17 / 15 in (standard pad) and 19.25 / 17.25 in (Fat Pads); pads 47 × 12 × 2.25, 50 × 12.5 × 4.5 (Competition Fat Pad), 50 × 14.5 × 4.5 in (Thompson). 7 images incl. the height graphic.
- [Thompson Fat Pad](https://www.roguefitness.com/thompson-fatpad) (PAD027): 50 × 14.5 × 4.5 in, black grabber vinyl, fits Rogue flat benches; 4 images. Entry shows it on MUB 2.0 / Shorty / FUB 2.0 (`base`). The red side print is a flat coloured panel (0.5 mm proud, included in the footprint), not artwork.

## Rogue Manta Ray (43) + Foot Catch (23)
- [Product page](https://www.roguefitness.com/rogue-manta-ray-adjustable-bench): 3×4 in 7-ga, 57 × 24.75 × 17.5 in, pad 2.25 × 12 × 52 in, 1 in gap, seat −20/0/10/20/30°, back 0/20/30/37.5/45/52.5/60/67.5/75/85°, ladder internal to the tube, manta-shaped front foot, optional Foot Catch; 8 images incl. clean side views flat/incline/decline.
- Estimated: Foot Catch rollers 114 × 165 mm on a two-station arm; manta foot outline; window slot size.

## APEX Adjustable Bench (31) + Stryker Pad (27)
- APEX Fitness / The Tib Bar Guy: [bench](https://www.apexfitness.com/products/apex-adjustable-bench), [Stryker Pad](https://www.apexfitness.com/products/apex-stryker-pad); 14 + 8 images including both spec cards.
- Bench spec card: 105 lb, 17 in height, 10.25 in front foot, 27.25 in rear foot, 55 in length, back 38.5 × 12 in, seat 13.25 × 12 in, 2.25 in pads, 1 in clearance, 7 in handle, back −10/0/15…85° (17), seat −20/−15/−10/0/5…30° (10), 11-ga with 6/8 mm plates, enclosed ladder, sundial seat indicator, 7 colours.
- Stryker card: 13 × 8.5 × 3 in pad, 7 angles, 9 heights. Modelled flat at a mid height on a chrome post in the head-end receiver.

## PRIME Fitness Shorty Adjustable Bench (29) + Preacher Curl Pad (17)
- [Shorty](https://www.primefitnessusa.com/products/prime-shorty-adjustable-bench) (10 renders in 8 colours), [Bench Preacher Curl Pad](https://www.primefitnessusa.com/products/bench-45-arm-curl-attachment-adjustable-bench-attachment) (5 renders), [Garage Gym Lab review](https://garagegymlab.com/prime-fitness-shorty-adjustable-bench-review/).
- Published: 51 × 27 × 18 in (with extension), 94 lb, ~10 in back pad, back 0/10/20/30/35/40/45/60/75/85°, 5 seat positions (decline/flat/incline), removable head-rest extension included.
- Estimated: seat angles −10/0/10/20/30°, 1.5–2 in pads (50 mm), preacher pad size; lime knobs and the bent lower brace from the renders.

## Major Fitness PLT01 (20)
- [Product page](https://www.majorfitness.com/products/weight-bench-plt01) (18 images incl. spec graphic), [Major blog](https://www.majorfitness.com/blogs/home-gym/discover-how-the-plt01-weight-bench-is-your-foundation-for-effective-strength-training), [Shredded Dad](https://shreddeddad.com/major-fitness-adjustable-bench/), [GGR](https://www.garagegymreviews.com/major-fitness-adjustable-bench-review).
- Published: 47.8 × 29.2 × 17.7 in, 1,300 lb, back 31.5 in (11.5 → 9 in), seat 12 in (10.5 → 8.5 in), 2.5 in padding, 4 seat positions, back −5° and 0–90° in 10° steps (Major's own blog; the product graphic shows 9 notches — noted conflict).
- Estimated: seat angles 0/15/30/45°, splayed leg spans, tube sections.

## Titan Seated Stationary Bench (19), TITAN Series Single Post Flat Bench (19), Elite Series Adjustable FID Bench (15)
- [Seated](https://www.titan.fitness/products/seated-stationary-bench): 43 × 30 × 37 in, 18 in seat, back 19 × 11.25 in, seat 11.5 × 11.25 in, 330 lb, front handle + rear wheels; 8 images incl. dimension drawing.
- [Single Post Flat](https://www.titan.fitness/products/titan-series-single-post-flat-bench): 50 × 26 × 17 in, pad 50 × 14 × 4 in, 3×3 11-ga, 1,200 lb, knurled front handle, rear wheels; 12 images.
- [Elite FID](https://www.titan.fitness/products/elite-series-adjustable-fid-bench) (spec from the scratch-and-dent listing): 56.75 × 25.25 × 18.25 in, back 36 × 11 × 2.25 in, seat 15 × 15 × 2.25 in, back 0/15/30/45/60/85°, seat 0/5/10/15°, 11-ga, foam foot anchors, knurled handle, rear wheels; 14 images.
- Estimated: recline 12° and tube sizes (seated), handle loop and post positions (flat), roller sizes (FID).

## Skipped
None; every product in the issue is shipped. Attachments are params on the bench they fit (Ironmaster × 5, Freak Athlete
Leg Developer, Manta Ray Foot Catch, APEX Stryker Pad, PRIME Preacher Curl Pad).
