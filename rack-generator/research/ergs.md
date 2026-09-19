# Ergs and air bikes (family `ergs`, section Cardio)

Issue #115, closes #76. Sources checked 2026-09-19. Every product is a floor item: origin at the footprint centre, X across
(+X = the user's right), +Y toward the flywheel / fan (or toward the column for ski ergs), Z up. The builder centres the build on its
XY bounding box, so the footprint *is* the bounding box; `ergs.test.ts` checks every param extreme against it to ±1 mm.

Code: `floor-parts/ergs.ts` (metadata, published envelopes), `parts/ergs.ts` (definitions), `parts/ergs-kit.ts` (shared Manifold
toolkit with the owned/`try-finally` delete pattern), `parts/ergs-rowers.ts` (Concept2 rowers + Echo Rower), `parts/ergs-bikeerg.ts`,
`parts/ergs-ski.ts` (SkiErg + Echo SKI), `parts/ergs-bikes.ts` (one parametric fan-bike engine) and `parts/ergs-bike-specs.ts`
(per-model air-bike geometry).

Photos: each product was checked against at least 8 photos (downloaded and viewed; counts below), plus the drawings named.
No manufacturer artwork is embedded: logos and decals are flat coloured plates.

## Concept2 RowErg (`concept2-rowerg`), Model D (`concept2-model-d`), Model C (`concept2-model-c`)

Sources: [RowErg product page + specification table](https://www.concept2.com/ergs/rowerg),
[RowErg spec sheet PDF](https://cms.concept2.com/sites/default/files/2024-06/RowErg_Specs.pdf),
[Model D manuals and schematics](https://www.concept2.com/support/indoor-rowers/model-d/manuals-and-schematics) (D2 assembly, D2 / light-grey / black master schematics, DE user manual),
[Model C manuals and schematics](https://www.concept2.com/support/indoor-rowers/model-c/manuals-and-schematics) (C assembly manual, master and front-leg schematics),
[Storing your indoor rower](https://www.concept2.com/blog/storing-your-indoor-rower), used-listing galleries at
[mygymequipment (Model D grey, Model C)](https://mygymequipment.com/products/concept-2-model-c) and [equip4gyms (Model C PM3)](https://www.equip4gyms.com/product/concept-2-model-c-pm3-rower/).
Photos viewed: RowErg 18 (Concept2 standard/tall profile, front, rear, leg, arm, storage, comparison renders), Model D 10 (light grey/blue, incl. the separated storage pose), Model C 20 (plus the schematic and assembly cover).

| Published | Value | Model |
|---|---|---|
| Length × width | 96 × 24 in (244 × 61 cm) | 2440 × 610 mm footprint |
| Seat height | 14 in standard / 20 in tall legs | seat top 356 / 510 mm |
| Monorail | 54 in (137 cm), aluminium I-beam, stainless track | 1372 mm (rear cap to front joint) |
| Use area | 9 × 4 ft (274 × 122 cm) | clearance 2740 × 1220 |
| Storage | two pieces; 25 × 33 × 54 in std, 27 × 47 × 54 in tall | see below |
| Front long leg | 23.6 in (60 cm) (D2 assembly) | V legs from the housing bracket to the caster stabiliser |
| Colours | black (RowErg / D), light blue-grey with blue rail (D 2006–12), grey front + black rail (C) | per-model palette |

Estimates (from the profile photo at 2.87 mm/px): flywheel housing Ø 482 mm (C: 500), 178 mm wide (C: 150), hub 638 mm up and
243 mm behind the caster front, housing on the +X side of the 76 × 112 mm front beam; monitor top ≈ 1140 mm; footplates 116 × 330 mm at
≈ 47°; rear foot 450 mm wide. Tall legs raise the monorail and front section 154 mm (the 6 in seat difference) with steel A-frame
rear legs and a W-lattice front leg frame.

Storage pose (param `pose`): the front section tips back about X until the caster wheels and the housing rim both touch the floor
(the angle is solved from the layout, ≈ 90°), the monitor arm folds 78° down along the beam, the handle hangs on the housing, and the
monorail stands on its rear end beside the beam (X −115) with its seat slid to the rear stop and its legs under the tipped section.
It stands exactly 54 in (1372 mm) tall. Modelled footprints: 645 × 880 mm (std; published 635 × 838), 645 × 1034 mm (tall;
published 686 × 1194), 645 × 889 mm (Model C). The published figures cannot be reproduced exactly from the in-use geometry (the tipped
front section alone is ≈ 880 mm deep), so the footprint follows the modelled pose and the test holds it within 7 % / 15 % of the
published box; the test also checks the two pieces do not interpenetrate. The pose matches the Model D storage photo (beam ≈ 65°,
casters and housing down, monorail vertical behind it). Tall legs stand the monorail 154 mm further out so it clears the taller
tipped section.

Earlier RowErg work (PR #105, `wave6/rowerg`) was reviewed and folded in here: its left-of-rack placement (450 mm gap, clear of the
default right-side bench, 4 ft use area still clear of the rack), the two-piece non-overlap check and the crowding test (use-area
warning in use, none in storage). Its storage pose fit the published 33 in only by shrinking the housing to Ø 400 mm; this family
keeps the photo-measured Ø 482 mm housing and reports the modelled footprint instead.

## Rogue Echo Rower (`rogue-echo-rower`)

Sources: [Rogue product page and specs](https://www.roguefitness.com/rogue-echo-rower). Photos viewed: 9 Rogue on-white renders
(side, rear three-quarter, front, rear, folded side and front) plus the hero image.

| Published | Value |
|---|---|
| Length × width | 99 × 26 in (2515 × 660 mm) |
| Seat height | 16 in (406 mm) |
| Folded | 38 × 26 in |

Estimates: housing Ø 520 mm, hub 660 mm up; 172 mm tall front beam with the ROGUE plates; splayed front legs to two axles
(front-right and rear-left) on Ø 180 × 52 mm turf tyres. Folded pose: the monorail swings up vertical on its hinge under the
footrests, the front section tips until the housing rim and the front tyres touch (solved from the layout) and the monitor arm folds
100° onto the beam. That rests at 921 mm deep (published 38 in = 965 mm); the footprint follows the modelled pose. Use area: Rogue
publishes none, so the Concept2 4 ft width over the machine length + 300 mm is used.

## Concept2 BikeErg (`concept2-bikeerg`)

Sources: [BikeErg page + specifications](https://www.concept2.com/ergs/bikeerg), [BikeErg fit guide PDF (side drawing)](https://cms.concept2.com/sites/default/files/2024-05/bikeerg_fitguide.pdf).
Photos viewed: 11 (three-quarter, close side, handlebar, seat, PM5, moving, toe clips, bottle holder, lifestyle).

| Published | Value |
|---|---|
| Length × width | 48 × 24 in (1219 × 610 mm) |
| Clearance for use | 60 × 48 in (1524 × 1219 mm) |
| Seat to pedal | 30.75–41 in (standard seat) → param `seat` 31–41 in |
| Handlebar | 10 in of height adjustment → param `bars` 0–10 in; reach 22.25–30.25 in |
| Crank, Q factor | 170 mm, 155 mm |

Estimates from the fit-guide drawing (2.38 mm/px): housing Ø 476 × 180 mm, hub 328 mm up, 355 mm ahead of centre; 207 mm deep box
frame; crank centre 267 mm up, 288 mm behind centre (lowest pedal 85 mm); bull-horn bars and PM5 on the silver stem. Height is not
published; the default is the mid settings.

## Concept2 SkiErg (`concept2-skierg`) and Rogue Echo SKI (`rogue-echo-ski`)

Sources: [SkiErg page + specifications](https://www.concept2.com/ergs/skierg), [Echo SKI page, specs and FAQ](https://www.roguefitness.com/rogue-echo-ski).
Photos viewed: SkiErg 15 (front, side, three-quarter, floor stand, wide stand, flywheel close-ups, PM5, in use); Echo SKI 28.

| Published | SkiErg | Echo SKI |
|---|---|---|
| Height | 85 in (2159 mm) | 85.5 in (2172 mm) |
| Floor stand | 23.5 × 50 in | 51 × 28 in |
| Wide floor stand | 32 × 52 in | — |
| Without stand | wall mount: 19 in bottom / 20.5 in top width × 16 in deep | 19.5 × 24.5 in |

Estimates: SkiErg column 110 × 200 mm tapering to 96 mm deep V arms, housing Ø 462 × 170 mm at 255 mm, lime handles parked in
holders at ≈ 900 mm, U-shaped stand tube to 805 mm; Echo SKI column 105 × 180 mm with slotted arms, 495 mm ROGUE pulley bar, fan
Ø 420 × 190 mm at 330 mm, Ø 150 mm turf wheels, orange handles parked at the top, U tube to 880 mm. The wall-mount envelope is the
top width (520.7 mm) × 16 in. Use area (no maker figure): the floor-stand platform as the standing zone plus the ISO 20957-1 0.6 m
free zone at the sides and behind the skier.

## Air bikes (`rogue-echo-bike`, `assault-airbike-classic`, `schwinn-airdyne-ad7`, `schwinn-airdyne-ad6`, `rep-strive-air-bike`, `bos-blitz-air-bike`)

One engine (`parts/ergs-bikes.ts`) builds the fan (pitched blades, wire or perforated guard, drum band, rolled rims), fork legs,
backbone, feet with transport wheels and levelling feet, drive shroud, 170 mm cranks and pedals, seat post / slider / saddle, handle
arms with rubber grips and link rods, console mast and badge plates. Each spec puts its extremes on the published envelope: fan
guard front at +L/2, rear foot (or slider) at −L/2, grip tips at ±W/2, top of the handles (AD7: console) at H. Use area: none of
these makers publishes one, so the ISO 20957-1 0.6 m free zone round the machine is used.

| Product | Source | Published L × W × H | Other published | Photos |
|---|---|---|---|---|
| Rogue Echo Bike V3.0 | [roguefitness.com/rogue-echo-bike](https://www.roguefitness.com/rogue-echo-bike) + official dimension drawing | 55 × 29.5 × 52.25 in | footprint 44.5 × 23.75 in, 27 in 10-blade fan, 11 × 5 seat settings, 1.5 in grips, 10.75 in between arms | 25 |
| AssaultBike Classic | [assaultfitness.com](https://www.assaultfitness.com/bikes/assault-bike-classic/), retailer galleries | 50.95 × 23.34 × 50 in (FAQ: 48.4 in H) | 98 lb | 15 |
| Schwinn Airdyne AD7 | [schwinnfitness.com](https://www.schwinnfitness.com/products/schwinn-airdyne-ad7), akfit.com | 53 × 26.5 × 53 in | min ceiling user + 17.6 in | 11 |
| Schwinn Airdyne AD6 | [schwinnfitness.com](https://www.schwinnfitness.com/products/schwinn-airdyne-ad6), outdoorgearlab review | 49.7 × 25.7 × 50.9 in | min ceiling user + 17.9 in | 12 |
| REP Strive (VPR) | [repfitness.com](https://repfitness.com/products/strive-air-bike-featuring-vpr) + landing page | 57.41 × 27.23 × 53.24 in | 35 mm grips, 100 mm casters, 8 VPR levels | 19 |
| Bells of Steel Blitz | [bellsofsteel.us](https://www.bellsofsteel.us/products/blitz-air-bike) | 53 × 23 × 51 in | 25 in fan, 10 seat positions | 10 |

Estimates (scaled from near side-on photos; Echo 29-ac4 at 3.36 mm/px, Assault d03, AD7 s06 at 1.82–1.88 mm/px): fan guard
diameters Echo 766 / Assault 650 / AD7 710 / AD6 620 / Strive 720 / Blitz 664 mm and hub heights 431–510 mm; blade counts
(10–12, AD6 8); fork and backbone layout (fork legs either side of the cage joined behind it); crank centres 256–320 mm up; saddle
heights at a mid setting. The Echo's grips angle back and out from arms 10.75 in apart; the AD7 console is its highest point.

## Not shipped

- Schwinn Airdyne AD4 and AD3: only three usable product photos of the shared "big fan" frame were found (Garage Gym Reviews),
  and the published dimensions disagree between retailers (48 × 22.5 × 50 in vs. 50 × 26 × 52 in). Left for a follow-up once a
  manual with a dimension drawing or a proper gallery turns up.

## Materials

All parts use fixed factory colours (`source` role, never rack paint), grips `handle`, tyres / feet / straps / cords `liner`,
chains and tracks `rod`, fasteners with an authored black-nickel finish. Scenery only; excluded from print export.
