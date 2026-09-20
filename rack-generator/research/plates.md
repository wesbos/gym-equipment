# Brand-accurate weight plates (#129)

Sources checked 2026-09-19. Every line is one entry in `rack-generator/plates-lines.ts`; its weights, per-weight
diameters and widths, face recipe, colours and markings are data, and `rack-generator/parts/plates.ts` turns them into
revolved Manifold solids. The numbers below are exactly what the table holds; anything marked *est.* is an estimate.
Brand names on the plates are typeset in the bundled Helvetiker Bold. No logo artwork, silhouettes or copied graphics
are embedded.

## How plates are modelled

- **Ids.** The eight original ids (`kg25`…`lb10`) are the two default lines (`standard-kg`, `standard-lb`). They keep their
  original geometry, names and param codes 1–8, so saved documents load and render the same. Every other plate is
  `<line>:<weight key>`, with an optional `@<finish>` for non-default colourways (`wio-machined:25@red`).
- **Params.** Storage pins receive `plateN` = `100 + line.code × 40 + weight index`, plus `plateNc` = finish index when it
  isn't the default. Both stay inside the geometry worker's (0, 4000] parameter domain. Line codes and the order of the
  weights and finishes are append-only.
- **Recipes** (`face.kind`):
  - `bumper`: a rubber body with a stepped inner zone, an optional raised lip, a chamfered tread and a stainless insert.
  - `competition`: rubber with a pocketed satin-chrome steel disc.
  - `iron`: a cast body with a dished front, optional dished back, hub boss, spokes, grip windows and relief medallions.
  - `calibrated`: a thin painted plate with a machined rim, a raised hub collar and a low raised cross.
  - `change`: a rubber-coated disc with a steel hub ring.
  - `flat`: machined or laser-cut discs.
  - `wagon-steel`: a laser-cut disc with a carrying lip band.
- **Markings.**
  - Printed ink is cut 0.5 mm into the face and filled flush with an ink solid.
  - Debossed text is cut in.
  - Raised text is relief that stays inside the face envelope. It is a separate "lettering" solid in the body colour, slightly glossier, or in its paint colour.
  - All markings are clipped to the face annulus.
  - Stack widths are therefore exact: every plate spans exactly its published width.
- **Patterns.** Fleck, speck and marble patterns are deterministic, seeded blobs clipped to each flat face band and inlaid flush. They stand in for the moulded pattern; they don't copy any one plate.

## Rogue Fitness

Photos: Rogue product galleries (Cloudinary `assets.roguefitness.com/…/catalog/…`). There were 12–18 per line; each was downloaded and looked at as a contact sheet.

| Line | Published | Table (diameter × width, mm) | Estimated |
|---|---|---|---|
| Echo Bumper V2 (LB) · [page](https://www.roguefitness.com/rogue-echo-bumper-plates-with-white-text) | 450 mm, 50.6 mm opening, widths 10 lb .83", 15 lb 1.04", 25 lb 1.50", 35 lb 1.90", 45 lb 2.40", stainless insert | 450 × 21.1 / 26.4 / 38.1 / 48.3 / 61.0 | insert OD 74, inner zone 0.44 R × 1.6 deep, print sizes |
| Color Echo (LB) · [page](https://www.roguefitness.com/rogue-color-echo-bumper-plate) | 450 mm, 50.4 mm opening, widths .83/1.04/1.5/1.93/2.36/2.75" | 450 × 21.1 … 69.9; 10/15 black, 25 green, 35 yellow, 45 blue, 55 red (photos) | colour hexes |
| MIL Spec Echo · [page](https://www.roguefitness.com/rogue-mil-echo-bumper-plates-black) | 450 mm, 50.6 mm, widths .83/1.2/1.6/2.07/2.72", raised black branding | 450 × 21.1 … 69.1 | lip 0.08 R, groove, relief height |
| Fleck Plates · [page](https://www.roguefitness.com/rogue-fleck-plates) | 450 mm, 50.4 mm 304 SS insert, widths .85/1.2/1.6/2.08/2.76/3.02", black + grey/white/green/yellow/blue/red | 450 × 21.6 … 76.7 | fleck coverage 45 %, blob sizes |
| HG 2.0 KG · [page](https://www.roguefitness.com/kg-rogue-bumpers) | 450 mm, 50.4 mm, widths 5 kg 1", 10 1.75", 15 2.625", 20 3.25", 25 3.5", black-on-black | 450 × 25.4 … 88.9 | raised ROGUE arcs and boxed HG/weight blocks |
| HG 2.0 LB · [page](https://www.roguefitness.com/rogue-hg-2-0-bumper-plates) | 450 mm, 50.4 mm, widths 10 1.00", 15 1.37", 25 2.00", 35 2.75", 45 3.25", 55 3.75" | 450 × 25.4 … 95.3 | as above |
| LB Competition · [page](https://www.roguefitness.com/rogue-competition-plates) | 450 mm, 50.40 ± 0.1 mm, widths 25 1.25", 35 1.70", 45 2.15", 55 2.50", IWF colours, chrome steel disc, raised lettering | 450 × 31.8 … 63.5 | disc 0.5 D (225 mm) × 4 mm pocket, lip, letter sizes |
| Deep Dish · [page](https://www.roguefitness.com/rogue-deep-dish-plates) | 5 lb 190 × 14.5, 10 229 × 20, 25 276 × 34.5, 35 360 × 34.5, 45 450 × 50, 100 450 × 75 mm; machined back/hub/rim; e-coat | as published | lip 0.11 R, dish 62 % of width, X spokes on 45/100, lettering |
| Deep Dish Arnold Edition | 45 lb only, 450 × 50 mm, machined rim/back/hub (page now redirects to Deep Dish; specs from retailers) | 450 × 50 | the embossed silhouettes are abstract raised medallions |
| Calibrated KG 2.0 · [page](https://www.roguefitness.com/rogue-calibrated-kg-steel-plates) | diameters 450/450/450/400/325/228/190/160/134/112 mm; 25/20/15/10 kg widths 27/22.5/21/21 mm ([GGR](https://www.garagegymreviews.com/rogue-calibrated-steel-powerlifting-plates-in-depth-review)) | as published | 50 kg width 54, 5 kg 16, 2.5 13, 1.25 10, 0.5 7, 0.25 5 mm; cross and collar |
| Calibrated LB 2.0 · [page](https://www.roguefitness.com/rogue-calibrated-lb-steel-plates) | diameters 450/450/400/325/228/190/160/134/112/90 mm | as published | all widths (from the KG line: 55 lb 27, 45 lb 22.5 … 0.25 lb 5 mm) |
| LB Change Plates · [page](https://www.roguefitness.com/rogue-lb-change-plates) | 1.25 lb 133.3 × 10, 2.5 162 × 15, 5 190 × 19, 10 230 × 26 mm; white/green/blue/white; rubber-coated metal | as published | hub collar 66 mm |
| 26'ER Wagon Wheels · [page](https://www.roguefitness.com/rogue-26-er-wagon-wheel-pair) | 26" diameter, 3.97" wide, 70 lb, 50.6 mm, recycled rubber, recessed grip points | 660.4 × 100.8 | 4 grip pockets (18°, 16 mm deep), inner zone |

Photo sets: Echo V2 12, Color Echo 16, MIL Echo 12, Fleck 13, HG LB 16, HG KG 11, Competition 11, Deep Dish 18, Arnold 9 (Rogue gallery copies via
[barbellpulse](https://www.barbellpulse.com/rogue-fitness-rogue-deep-dish-plate-arnold-edition/) and
[Outdoor Fitness Society](https://outdoorfitnesssociety.com/equipment/rogue-deep-dish-plates-arnold-edition/)), Calibrated KG 16, Calibrated LB 15,
LB Change 11, 26'ER 8 (5 Rogue plus 3 video stills).

## Iron plates

| Line | Published | Table (mm) | Estimated |
|---|---|---|---|
| The Strength Co. Olympic Iron · [page](https://thestrengthco.com/products/olympic-barbell-plates) | 45 17.75 × 1.25", 35 14.75 × 1.25", 25 11.75 × 1.25", 10 9.13 × .88", 5 8 × .63", 2.5 6.5 × .5", 1.25 5 × .3", 100 17.75 × 2.25"; 1.99" bore; e-coat | 450.9 × 31.8 … 127 × 7.6 | dish 55 %, X spokes (≥ 225 mm), 3-line raised name block |
| CAP 2" Olympic Plate (OPG#2 grey, OP black) · [page](https://capbarbell.com/products/cap-barbell-cast-iron-olympic-weight-plate), sizes from [Iron Company](https://www.ironcompany.com/cap-barbell-gray-cast-iron-olympic-plates) | 2.5 6.5 × .5", 5 8 × .75", 10 9 × 1", 25 11 × 1.5", 35 14 × 1.5", 45 17.75 × 1.5", 100 17.75 × 2.5" | as published | hammertone, rib (spoke) and dish, silver lettering |
| CAP 2" Olympic Grip Plate · [page](https://capbarbell.com/products/cap-barbell-cast-iron-olympic-grip-plate) | weights, 2" opening, three grip openings, silver-painted weights | 45 452 × 40.6 … 2.5 175 × 19.1 | **all sizes estimated** from photos against the bore; tri-grip windows 0.62–0.82 R; badges |
| York Legacy Precision Milled · [page](https://yorkbarbell.com/product/2-inch-legacy-cast-iron-precision-milled-olympic-plate/) | 2.5 6.5 × 7/16", 5 7.5 × 3/4", 10 9.125 × 1", 25 12 × 1.25", 35 14.875 × 1.375", 45 17.5 × 1.5"; milled back and edge | as published | dish, spokes, white-filled YORK/weight |
| Weight It Out Cast Iron Machined · [page](https://www.weightitout.us/products/cast-iron-machined-weight-plate-pairs) | 100 17.72 × 1.75", 45 17.72 × 3/4", 25 14.5 × 5/8", 10 8.9 × 5/8", 5 7 × 1/2", 2.5 5.6 × 2/5"; dual handle; 9 colours | as published; black default + 8 finishes | slot size and position, deboss layout |
| Ivanko OM Series · [page](https://ivankobarbell.com/products/om-series-olympic-machined-plate) | 45 17-3/4 × 1-9/16", 35 14-3/16 × 1-9/16", 25 11-13/16 × 1-9/16", 10 9 × 1-1/4", 5 7-3/4 × 7/8", 2.5 6-7/16 × 5/8", 1.25 5-1/4 × 1/2"; machined back, edge and rim | as published | 1985 grey, 3 spokes, lettering (100 lb skipped: its listed 1-2/8" width is not usable) |
| REP Equalizer Urethane · [page](https://repfitness.com/products/urethane-coated-equalizer-plate-pairs) | REP drawing: 45 17.7 × 1.8", 35 14.3 × 2.0", 25 12.25 × 2.0", 10 8.8 × 1.4", 5 7.7 × 1.0", 2.5 6.25 × .9"; six grip holes; debossed white inlay | as published | hex size 0.19 R at 0.64 R, rib, hub insert 78 mm |
| REP Old School Iron · [page](https://repfitness.com/products/old-school-iron-plate-pairs) | REP drawing: 45 17.7 × 1.5", 35 14.3 × 1.5", 25 10.7 × 1.5", 10 8.8 × 1", 5 7.7 × .75", 2.5 6.25 × .5"; deep lip; raised silver lettering | as published | spokes, dish |

Photo sets: Strength Co 20, CAP iron 12, CAP grip 14, York 14, Weight It Out 57, Ivanko 18, Equalizer 14 (with the drawing), Old School 15.
REP drawings (`acf.*_Dims.png`) have white thickness labels on a transparent background; they were composited on grey to read them.

## Other bumpers, change and fractional plates, wagon wheels

| Line | Published | Table (mm) | Estimated |
|---|---|---|---|
| REP Black Bumper (LB) · [page](https://repfitness.com/products/black-bumper-plate-pairs) | drawing: 17.7" all; 45 2.8", 35 2.4", 25 1.8", 15 1.2", 10 1.0"; hooked steel insert; white raised text | 449.6 × 71.1 … 25.4 | insert, lettering |
| REP Change Plates (LB) · [page](https://repfitness.com/products/change-plates-lb) | drawing: 10 8.75 × 1.0", 5 8.25 × .75", 2.5 6.25 × .6", 1.25 5.25 × .5"; white/blue/green/white | as published | steel ring 86 mm |
| Fringe Sport Savage · [page](https://www.fringesport.com/products/savage-bumper-plate-pairs) | 450 mm (10 lb 445 mm), 50.3 mm insert, widths 55 3.2", 35 2.35", 25 1.87", 15 1.2", 10 1.05" | 450 × 81.3 … 445 × 26.7 | 45 lb width: Savage lists 2.35" (a duplicate of the 35 lb figure); the Fringe Black 2.9" is used. Colours grey/orange/green/yellow/blue/red from photos. Marble streaks. |
| Fringe Sport Black Bumper · [page](https://www.fringesport.com/products/onefitwonder-black-bumper-plates-pairs) | 450 mm (10 lb 445), widths 55 3.2", 45 2.9", 35 2.35", 25 1.87", 15 1.2", 10 1.05", bevelled edge | as published | relief sizes |
| CAP Olympic Rubber Bumper (black) · [page](https://capbarbell.com/products/cap-olympic-rubber-bumper-plate-black) | dimension graphic: 17.75" diameter, 1.9375" hub, 2.60" (45 lb) | 450.9 × 66.0 (45) | other widths est. 1.1/1.4/1.75/2.2/3.0" |
| BalanceFrom Olympic Bumper · [page](https://vminnovations.com/products/balancefrom-fitness-370-pound-olympic-bumper-strength-training-weight-plate-set) | dimension graphic: 17.75" all; 55 3.66", 45 2.83", 35 2.05", 25 1.93", 15 1.18", 10 1.09"; colour-coded lb + kg print | as published | print sizes |
| HomeGrown Lifting Hyper-Thin + URA-MAX · [page](https://homegrownlifting.com/products/new-product-hyper-thin-45s) | 17.72"; Hyper-Thin 45 2.4"; URA-MAX 45 3.6", 35 3.1", 25 2.5", 15 1.6", 10 1.1"; 2" press-fit 304 SS | as published | coloured crumb specks (red/blue/yellow/orange/grey) |
| Micro Gainz Olympic fractional · [page](https://microgainz.com/products/micro-gainz-olympic-size-fractional-weight-plates-set-of-10-plates-25lb-1-25lb-w-bag) | 3.5" sintered steel: 1.25 .815", 1 .651", .75 .481", .5 .323", .25 .164"; 2.5 lb 7" × 1/4" laser-cut steel, white pad print | as published; black + multi-colour finish | multi-colour assignment per weight |
| Titan Wagon Wheel Pulling Blocks · [page](https://www.titan.fitness/products/45-lb-pair-wagon-wheel-pulling-blocks) | 26", 0.375" laser-cut steel, 51 mm collar, 2" lip, 45 lb | 660.4 × 50.8 | 9 wedge windows, collar 76 mm, cut-through lettering |

Photo sets: REP Black 18, REP Change 13 (LB and KG galleries share the design), Savage 30, Fringe Black 17, CAP bumper 9, BalanceFrom 18, HomeGrown 21, Micro Gainz 21, Titan 8.

## Not shipped

- **Fitness Gear plates** (Dick's Sporting Goods house brand). dickssportinggoods.com returns 403 to every client we tried
  (curl, fetch and headless Chromium), and no retailer or review page publishes sizes or a usable gallery, so the line
  could not be sourced to the playbook's bar.
- **Micro Gainz dumbbell fractional plates** (the magnetic or wrap-on 1.25/2.5 lb dumbbell add-ons). They are not Olympic
  plates and don't load on pins or sleeves. The Olympic fractional set (same 1.25 lb weight) is shipped.

## Visual review rounds

Every line was checked against its photos in three render rounds:
1. A front-view lineup of all weights per line.
2. The heaviest plate face-on next to a product photo, plus a loaded barbell.
3. The same pairing again for the lines changed in round 2.

Storage pins loaded with every line were also screenshotted in the builder. The loaded-barbell renders were first made in a scratch preview (`buildBarbell` plus `buildPlateStack` on both 415 mm sleeves); since #160 every bar with a `bar` spec loads plates in the builder itself (`bar-loads.ts`).

Changes made from the comparisons:
- **Rogue.** ROGUE is typeset extended (`sx` 1.12, 0.16 R cap height). Weight labels are condensed. Fleck is denser and finer.
- **Competition.** Satin-chrome disc and larger numerals, with COMPETITION / LB beneath.
- **Calibrated 2.0.** Deeper reds and big condensed numerals over a small unit. The raised cross now reads.
- **Cast relief.** Spokes, crosses, relief lettering and medallions are a glossier body-colour solid, so black-on-black relief reads the way it does in the photos (HG 2.0, MIL Echo, Deep Dish, The Strength Co., CAP bumper, Fringe Black).
- **Hammertone.** The CAP grey and Ivanko 1985 grey are darker and less metallic.
- **Ivanko.** BARBELL / COMPANY read clockwise between the spokes.
- **Fringe.** Big numeral over a small TRAINING / LB.
- **Savage.** Marble streaks use a dark shade of each colour.
- **BalanceFrom.** LB on the left and two-decimal KG on the right.
- **Titan.** Wider wedge windows starting at 0.38 R, leaving room for the cut-through TITAN / 45 LB.
- **Micro Gainz.** The small-plate logo is debossed.

## Checks

`rack-generator/plates-lines.test.ts`:
- builds every plate of every line and finish as valid closed solids;
- checks the axial extent equals the table width and the diameter is within 0.6 mm;
- checks the 50.4 mm bore stays clear and each plate stays under 40k triangles;
- spot-checks 40 published sizes;
- round-trips ids, params and finishes;
- checks peg capacity with per-weight widths;
- checks save/load, both paired pins, and the floor check for 26" wheels.

`plates.test.ts` still covers the default lines unchanged.
