# Lever arms, belt squat attachments, band pegs & grip (#135)

Rack parts in two sidebar sections, **Levers & belt squat** and **Band pegs & grip**. Metadata is in
`rack-parts/rack-levers-belt-squat*.ts` and builders in `parts/rack-levers-belt-squat*.ts`. Tests are in
`rack-levers-belt-squat.test.ts`, and the registry sweep is in `rack-registry.test.ts`. Popularity comes from Gym
Radar (Sep 2026). Sources were checked 2026-09-19. Photos were downloaded to the agent scratchpad and reviewed as
contact sheets and full-size images, with two render-vs-photo rounds per product.

Frame for all builders (rack-part.ts): the origin is on the upright centreline at the target hole, +Y points out of
the mounting face, X runs across the face and Z is up. Pose params move the levers about their real pivots. The same
pose math is used for the metadata `extent` and `bodies` (in the `*-levers.ts` / `*-rhino.ts` metadata files), so the
builder, the hole limits and the collision boxes always agree.

## Fringe Sport Mammoth Belt Squat (`fringe-sport-mammoth-belt-squat`, 164)

Sources:
- [Product page](https://www.fringesport.com/products/mammoth-belt-squat) and `products/mammoth-belt-squat.json` (22 images, variants, spec block).
- The [Kickstand](https://www.fringesport.com/products/kickstand) and [Dual Mounted Weight Horns](https://www.fringesport.com/products/dual-mounted-weight-horns) accessories.
- The [GGR review](https://www.garagegymreviews.com/fringe-sport-belt-squat-review).
- YouTube thumbnails from GGR and Gluck's Gym. The GGR thumbnail is a clean side elevation of the whole arm, and it was the scale reference.

It is a single lever: a fork of two flat plates straddles one upright and is pinned through it. The pin is the pivot. A 30 in 2x3 arm is bolted in the fork, with a 14 in vertical horn near the tip and an eye bolt at the tip for the belt chain. There is no platform. The tip rests on the floor.

| Dimension | Value | Basis |
|---|---|---|
| Pivot to tip | 39 – 48.75 in (param: 39 / 42.25 / 45.5 / 48.75) | published |
| Main tube | 2x3 11 ga, 30 in, laid flat (3 in wide, 2 in tall) | published (GGR) |
| Loading horn | 14 in long, 1.95 in OD on a 3.5 in collar | published length; OD and collar measured off the side elevation |
| Horn position | 13.5 in back from the tip | measured (27.5 px/in off the 14 in horn) |
| Fork plates | 25.8 in long, 3/8 in, 2.9 in tall at the pivot tapering to the tube height, 11 × 3/4 in adjustment holes | measured / estimated |
| Adjustment bolts | three M16 bolts at 14.7 / 22.1 / 24.7 in from the pivot | published size, positions measured |
| Pivot | keyhole 1 in over 5/8 in; Magpin 1 in (black) or 5/8 in (red) | published |
| UHMW pads, eye bolt, tip foot | on the fork inner faces; zinc lifting eye; rubber foot under the tip | photos |

Poses: resting on the floor (−21°), level, and top of the squat (+20°). The default placement is low on the outer side face (hole 8, 465 mm on the stock rack), with the arm running forward and the foot about 15 mm off the floor. The rest pose assumes the real 14–22 in pivot height. The `side` param sets which way the arm points, and `load` stacks plates flat on the horn through `buildPlateStack`. The kickstand and dual horns are not modelled.

## Bells of Steel Shoulder Boulder / Chest Fly (`bells-of-steel-shoulder-boulder`, 33)

Sources:
- [US product page](https://bellsofsteel.us/products/shoulder-boulder-chest-fly-attachment) and the Shopify JSON.
- The dimensioned spec sheet `SHBLD-RA-PRNT-specs-newJuly2026.jpg`.
- The manual `PM_SHBLD-RA-HDR_2025-12-16-v5.pdf` (parts list and exploded steps).
- Nine gallery photos.

| Dimension | Value | Basis |
|---|---|---|
| Width across the top | 524 mm (the index discs come out at 540) | published |
| Crank, pivot to horn | 307.5 mm | published |
| Horn span when hanging | 686 mm (sets the 21.6° crank rest angle) | published / derived |
| Horns | 50 × 172 mm, zinc | published |
| Height / depth | 785 / 465 mm (built: ≈ 780 / ≈ 470) | published |
| Sleeve | 97 mm inside × 129 mm tall, UHMW lined | published |
| Pivot spacing, crossbar 50 × 60 mm, handle arm 40 × 40 × 330 mm, 25 mm handle with a 24° forward bend, Ø130 disc with 22 holes | | estimated from the spec sheet and manual |

The sleeve wraps the upright on three sides and is closed by the crossbar and the stainless BOS plate. The red pull pin runs side to side (`pinAxis: 'across'`), and the spin-lock knob sits on the back. The pivots point straight out of the face. Each side carries a load crank and horn behind the pivot, and a chrome index disc, bronze washer, handle arm, chrome pop-pin knob and rubber-gripped handle in front. The `swing` param (0/30/60/90°) raises both sides together, mirrored. Only the 3x3 version is modelled, and `validate` refuses other tubes.

## Rogue Velocidor (`rogue-velocidor`, 27)

This is a dip station, not a lever arm. Sources: the [product page](https://www.roguefitness.com/rogue-velocidor) (RA2789) with its 20 gallery images and renders. Those include the angle-setting side elevation and the narrow, mid and wide top views.

| Dimension | Value | Basis |
|---|---|---|
| Width | 25-3/16 in | published |
| Height | 12 in | published |
| Crossbar | 3x3 7 ga, 1/4 in plate, 44.5 lb | published |
| Handles | 1.9 in × 16 in usable, sockets 13.5 / 17.25 / 21 in apart | published |
| Handle clock | 7° out (standard), parallel, 7° down or 7° up | published |
| Pin | 5/8 in (Monster Lite) or 1 in (Monster) | published |
| Crossbar front 9.25 in from the face, 7° chevron, gusset outline, guard plates, caps | | measured off the side elevation (3 in tube as scale) |

The pin runs side to side through the bracket. Params are `series`, `spacing`, `angle` (clock) and `finish` (knurl break rings every 4 in on the knurled version). The stored (flipped) position is not modelled, and the laser-cut lettering is left off.

## Get RXd RX3 Center Post (`getrxd-rx3-center-post`, 27)

Sources: the [product page](https://www.getrxd.com/products/rx3-center-post-bundle) and `products/rx3-center-post-bundle.json`, with 11 renders including the dimension graphic.

The published figures are a 3x3 (75 mm) 11 ga L-post, 576 mm W × 390 mm H × 230 mm, 1 in holes at 2 in spacing offset on all four sides, two 1 in chrome pins with knurled nuts, black powder coat and a laser-cut logo plate. The 230 mm is the mount plate height. The pins are two stations apart (estimated from the renders, where the knobs sit about 2.3 pitches apart), and the gussets and knob size are estimated. The default placement is the inner side face, so the post drops at the centre of the bay: 576 − 37.5 = 538.5 mm, about half of a 43 in bay.

## Vendetta 180° Lever Arm Adapters (`vendetta-180-lever-arm-adapters`, 26)

Sources: the [Titan 3x3 kit](https://vendettastrengthandathletics.com/products/adjustable-lever-arm-titan-adapter-mounts-pair) and the other versions (RG-ML 1.0, RG-M 1.0, RG 2.0, SX, REP RP-ISO), the assembly PDFs, and 50 product images (renders, before/after photos, flat plates).

These are index plates that set a lever arm's rest angle across 180° with a 5/8 in hitch pin. The arm still swings freely upward off the pin. The model is the full 180° trolley kit, which fits any 3x3 rack with 5/8 in or 1 in holes. It carries a 42 in 3x3 arm, which is an estimate: the kit fits other brands' arms.

Published: 1/4 in plate, 8 rollers per trolley on 1/2 in zinc bolts, rear spring pin, 15° increments, 250 lb per arm static. Estimated: the Ø9.5 in disc, a 5.4 × 8.2 in trolley section, the slot ring and the arm length.

The `position` param has 13 rest angles (0–180°, 15° steps). The hitch pin sits in the ring just below the arm. The trolley plates are raw steel grey, as in the before/after photo.

## Rogue Monster Lite Lever Arms / Jammer Arms (`rogue-monster-lite-lever-arms`)

This product (RF0716) is discontinued. There was never a separate "Monster Lite Jammer Arms" SKU, since Rogue's own image files for RF0716 are called `ml-jammer-arms`. Sources:
- The archived product pages for [RF0716](https://web.archive.org/web/20170701064256/http://www.roguefitness.com/monster-lite-lever-arms) and RF0710 (the Monster twin).
- 12 photos: the flat-lay with hardware, the handle comparison, and high and low installs.

| Dimension | Value | Basis |
|---|---|---|
| Arms | 3x3 11 ga, 38.75 in | published |
| Bracket | 3/8 in laser-cut bent plate, pin-and-bushing hinge | published |
| Handles | 1 in Sch 40 (1.31 in OD), grips 10 in apart, standard or neutral | published |
| Weight post | 11-5/8 in loadable | published |
| Sold as | a pair | published |
| Two bracket bolts two stations apart through the side holes, hinge 2 in ahead of the face, 3.5 × 12.5 in handle plate, post between the grips | | estimated from photos |

The pair is `handed`: the second unit is mirrored so both handles point inside the rack. The `swing` param rotates each arm forward about its hinge (0/30/60/90°). `series` switches between Monster Lite 5/8 in and Monster 1 in, and `autoFit` picks it from the bore.

## Rogue Monster Rhino Belt Squat Drop-In (`rogue-rhino-belt-squat-drop-in`, 21)

Sources: the [product page](https://www.roguefitness.com/rogue-monster-rhino-belt-squat-drop-in) (RA1592), the drop-in and stand-alone assembly manuals (IS0431, IS0430), the two dimensioned spec drawings and 22 photos.

| Dimension | Value | Basis |
|---|---|---|
| Envelope | 48.5 in deep × 49 in wide × 78.5 in tall, 21.5 in past the uprights | published |
| Platform | 26 × 48.5 in, top 7 in off the floor, 1/8 in diamond tread on a 1x3 frame | published |
| Tower | 3x6 | published |
| Weight posts | 15.75 in, stainless | published |
| Hinges | 1 in × 5.56 in shafts, 1 in bolts | published |
| Deck pulley / cable | 6 in / 1/4 in | published |
| Rack fit | Monster 3x3, 1 in holes, 43 in inside | published |
| 50 in arms hinged 4 in off the floor, 12° engaged lean, horn post leaning 18° more, trolley parked about 22 in up, tower 394 mm ahead of the face, cable route | | estimated from the drawings and manual |

The drop-in is placed on the lowest hole (the lever hinge bolt) of a front upright, and spans the published 43 in to the next upright. `validate` refuses racks that aren't 3x3, don't have a Monster inside width (±45 mm) or aren't bolt-down (first hole ≤ 70 mm). The builder can't see rack depth, so the platform is always shown at its real 26 in. Its collision bodies cover only the tread deck, which sits above the rack's low beams. The frame below interlocks with the rack. Poses: engaged (horn under the trolley) or released. Plates load on both trolley posts.

## Band pegs, storage pins, grip and the hoop

| Product (id, gyms) | Published | Estimated | Photos |
|---|---|---|---|
| Rogue Monster Lite/Infinity Band Pegs (`rogue-monster-lite-band-peg`, 38) — [page](https://www.roguefitness.com/rogue-monster-lite-band-pegs-4-pack) | 10 in × 5/8 in, zinc plated, bright zinc or black, 4-pack | standard 5/8 in hex head (15/16 in AF, 27/64 in), stamped R shown as a shallow recess | 12 (RF0329 BR and IL galleries) |
| REP Band Pegs 2.0 (`rep-band-pegs-2`, 25) — [page](https://repfitness.com/products/band-pegs-2-0) | 8.5 in end to end, washer welded 3-3/8 in from the bottom end, 4.5 in usable, cotter pin, bright chrome, 1 in (5000) / 5/8 in (4000), sold in pairs | head disc 2 / 1.375 in, washer 1.75 / 1.25 in, thicknesses 3/8 and 1/4 in | 2 (REP publishes only two product images; the original 12 in T-peg image was checked for contrast) |
| Rogue Monster Plate Storage Pin (`rogue-monster-plate-storage-pin`, 50) — [page](https://www.roguefitness.com/rogue-monster-plate-storage-pin) | 1.9 in Acetal sheath on a 1 in threaded pin, 6.75 / 12.75 in loadable, Acetal washers, keyhole or keyless, machined nut or 2.125 in Knurled Knob, matte black | collar 2.25 × 0.625 in, nut 1-5/8 in AF, keyhole nub | 12 |
| Rogue SP3358 Plate Storage Pair (`rogue-sp3358-plate-storage`, 22) — [page](https://www.roguefitness.com/sp3358-plate-storage-long-for-monster-lite) | SP3358 12.5 in (5/8 in hardware), SP33100 11.75 in (1 in), SP2358 12.25 in (5/8 in), bolted 6 in on centre | 2.5 × 1/4 in face plate, 1.9 in post, zinc spacer, rubber cap | 7 (RF0469 and RF0468 galleries) |
| JD Gym Equipped Rack Mounted Wrist Roller (`jd-gym-equipped-wrist-roller`, 34) — [page](https://jdgymequipped.com/products/rack-mounted-stainless-wrist-roller) | 2 in stainless grip, 16 in, paracord and stainless carabiner, smooth or knurled, mounts for 3x3 with 1 / 3/4 / 5/8 in holes (and 2x2 1 in), crank handle 1.25 / 1.5 in | spool position and size, Delrin washers, crank 3.3 in drop, 3.6 in reach, 7 in grip | 11 (6 distinct views) |
| Oak Club Mfg The Iron 3 ("Oak Club Iron", `oak-club-iron-3`, 29) — [page](https://oakclubmfg.com/products/the-iron-3), [Gym Radar](https://gymradar.com/equipment/oak-club-iron) | 9 in mini hoop, 16.75 × 10.75 in steel backboard, 4.5 in ball, fits 3x3 posts with 1 or 5/8 in holes (MagPin or hitch pin sold separately), Sandtex Black / Red Baron / Matte White | 3/16 in plate, 1.25 in standoff, wrap bracket round the post, pin 2.3 in above the board bottom, card cut-outs simplified (border, shooter square, Q, club), 16-hook net | 12 (9 Oak, 1 Gym Radar, 2 owner reviews) |

Stored plates on the storage posts use `buildPlateStack` with `detail: 'simple'`. The load presets are only offered when the stack fits the loadable length.

## Bore and tube fit (rack profiles, #130)

Each brand part is built for the tube and bore its maker sells it for. Monster 1 in parts (plate pin, RX3 post, Rhino) refuse 5/8 in racks through the pin class. `autoFit` picks the Monster Lite / 5/8 in variant on RML-390, PR-4000 and Hydra, and the Monster / 1 in variant on RM-4, PR-5000 and Manticore. That covers the Velocidor, SP3358 family, lever arms, Mammoth pin, wrist roller, hoop pin, REP pegs and Vendetta pin. Parts that need a 3x3 sleeve or trolley (Velocidor, Shoulder Boulder, Vendetta, RX3, Rhino) refuse 2x3/2x2 posts with a message, e.g. on the R-3.

## Not shipped

- **Rogue Monster Strip (39) / 3x3 Strip 2.0 (24):** these are **wall-mounted** storage tubes lagged into studs or concrete ([Monster Strip](https://www.roguefitness.com/monster-strip), [3x3 Strip 2.0](https://www.roguefitness.com/the-3x3-strip-2-0)). Rogue gives no rack-mounting option, so they don't fit the rack-part contract. They belong in a wall-storage slot. Published data for them: 36 in or 16 in long, 3x3 11 ga, 2 in side-hole spacing, wall-mount holes 8/16 in on centre (36 in) or 12 in (16 in), 1 in × 4.5 in or 5/8 in × 4 in detent pin, MG Black or Signature Texture Black.
- The Rogue Monster Band Peg 2.0 was already the registry proof entry (`rogue-monster-band-peg-2`).
