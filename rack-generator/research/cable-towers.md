# Stand-alone cable towers, lat pulldowns and functional trainers (issue #122)

Sources checked 2026-09-19. Owner counts are Gym Radar (Sep 2026). Every entry is a floor part in the **Machines** section:
metadata in `floor-parts/cable-towers.ts` (`*_DIMS` constants shared with the builders), Manifold builders in
`parts/cable-towers.ts`, shared helpers in `parts/cable-towers-kit.ts` (tubes, rods, sheaves, pads, text, material groups,
sub-assembly transforms) and `parts/cable-towers-components.ts` (selector stack with pin, swivel pulley, cable end,
D-handle, lat bar). Build frame: X across, −Y is the user side, Z up; the kit recentres the XY bounding box on the origin
(or on a pinned centre, see Titan plate-loaded). All colours are factory `source` materials, never rack paint.

Photos were downloaded from the manufacturers' Shopify `products/<handle>.json` galleries, retailer galleries and review
sites and viewed as contact sheets and full-size stills; manuals were rendered page by page. Render-vs-photo review:
round 1 on every entry (iso/front/side/top against the studio photos), round 2 after the fixes listed per product.

Common estimates (all products): hidden cable routing is drawn as straight runs between pulley tangents (not a cable-length
or ratio simulation); pulley plate outlines, bolt patterns and tube wall gauges are visual; stack plate footprints are sized
from photos so the published weight range gives a plausible stack height; loaded plates are 45 lb iron (Ø448 mm, the shared
`buildPlateStack`); handles hang from their carabiners and shorten at the lowest trolley holes so the grip rests just above
the floor. Brand names are typeset in the bundled Helvetiker font as flat plates; no logo artwork is copied.

## 1. Bells of Steel Cable Tower (56 owners) — `bells-of-steel-cable-tower`

- [Product page](https://bellsofsteel.com/products/cable-tower) (`products/cable-tower.json`: 6 gallery images, variants
  STK-PULT-MA/UPR 210 lb, MINI-STK-PULT 110 lb, PULT-MA/UPR plate loaded, with/without upright)
- [Dimension drawing](https://bellsofsteel.com/cdn/shop/files/pult5-ma-prnt-newdesign-specs.jpg): 2051 mm (80¾") tall,
  787 mm (31") header, 724 mm (28½") base, 737 mm (29") feet — identical for stack and plate loaded
- [STK-PULT4-MA assembly manual](https://bellsofsteel.com/cdn/shop/files/PM_STK-PULT4-MA-SET_-_2025.12.19-v2.pdf): parts list
  with Ø90 × 12 and Ø114 × 1 pulleys, 12-35 popper pin, 10×100 weight pin, base (32) + feet (30), end bracket (39)
- [Garage Gym Reviews review](https://www.garagegymreviews.com/bells-of-steel-cable-tower-review) and photos: 2" × 2" tube,
  33 height settings, 210 lb stack in 10 lb steps with green/yellow/red label stripes, aluminium pulleys on the stack version

Photos reviewed: 6 studio renders (stack/mini/plate, with/without upright), spec drawing, 6 GGR photos (stack close-up with
labels and pin, crossover in a gym, pull-up, plate-loaded option), 4 manual pages.

Model: two sled feet (angled ends, rubber pads) joined by the spine, silver 2" upright with 33 holes on 2" pitch (numbers
every fifth hole), header back to the wall brackets or the optional black back upright, stack of 20 × 1" plates + head plate
under the rear header (110 lb mini: 10 plates) with the floating Ø114 pulley, or the plate-loaded twin-sleeve carriage with a
cross horn; carriage with UHMW liners, pop pin, two Ø90 pulleys and twin swivel pulleys with ladder-strap handles.
Estimates: hole 1 at 183 mm (from the etched numbers in the studio photo), stack plate 118 × 290 mm, 17 mm holes, stack
position toward the wall. Round 2: pulleys switched to polished aluminium, stack labels narrowed and centred on the pin.

## 2. Temple of Gainz Selectorized Standing Multi-Flight V3 (41) — `temple-of-gainz-multi-flight-v3`

- [Product page](https://templeofgainz.com/products/selectorized-standing-multi-flight-machine-the-deltoid-variant-lateral-raise-machine-version-3)
  (17 studio renders incl. dimension drawing): 76.4" H, 44.7" front base, 28.7" rear base, 26.5" deep, 62.1" across flat
  handles; 30 sliding-assembly positions (V3), three-position head pad, laser-cut dial numbering; 11 lb (5 kg) plates to
  220 lb (100 kg) per the stack labels.

Model: V base (short rear tube, splayed front feet), twin posts with top cap and gussets, chrome guide rods, 30-position
numbered strip with the sliding-assembly pop pin, twin Ø300 dial cams with white rings and tick marks, lobed plate with brand
plate, drop arms with angled foam handles, head pad on its stalk (three angles or removed), gas-spring assist, arched front
shroud, rear logo shroud and the header exercise placard. Footprint depth 690 mm = the 26.5" base plus the handle tips.
Estimates: post section 76 × 102 mm, cam centre 60 mm above the pin, 1" position pitch, stack plate 400 × 110 × 14 mm, the
stalk shortening at the top positions. Round 2: posts moved out to the photographed ~25" frame, narrow centred stack labels.

## 3. Titan Plate-Loaded Lat Pull Down & Cable Row V2 (26) — `titan-plate-loaded-lat-pulldown`

- [Product page](https://www.titan.fitness/products/plate-loaded-lat-tower) (14 photos): 85" H × 47" W × 57" D, 13" sleeve,
  37.5" lat handle, 15" low-row handle, 400 lb, 1:1
- [Operator manual SALPLRv2](https://support.titan.fitness/hc/en-us/articles/4906801973389): exploded view and parts list —
  1100 mm lower guide-frame tube, Φ95 pulleys × 7, seat cushion 280 × 300 × 60, foams Φ100 × 180, guide frames, sliding sleeves

Model: T base (1100 mm rear tube, long base frame, foot frame with twin diamond footplates), single upright with the TITAN
strip, top beam with bar hook, twin chrome guide rods and the plate holder with its single 13" sleeve to the left, seat on the
braced cushion frame, four-position thigh foams, figure-8 floating pulleys, lat bar and low-row handle. Titan lists 47" width;
the model's widest member is the manual's 1100 mm rear tube (documented discrepancy). Loaded Ø448 plates overhang the rear
tube, so the footprint grows backwards with a floor offset while the machine origin stays put.

## 4. Titan Lat Tower 10–300 lb Selector (21) — `titan-lat-tower-300`

- [Product page](https://www.titan.fitness/products/lat-tower-10-300-lb-selector) (12 photos): 87" H × 41" W × 57" D,
  48" × 1" knurled stainless lat bar, 14" low-pull handle, 17" × 9" footplate, 10 lb start / 300 lb stack, 1:1, red anodized
  aluminium pulleys; [operator manual](https://support.titan.fitness/hc/en-us/articles/4910021663885)

Model (shared lat-tower builder with #9): 3" × 3" uprights front and back with the stack between them, top frame, bolted arm
plates with TITAN letters reaching over the seat, J-hook for the bar, seat box with twin thigh rollers and footplate. The 48"
bar hangs wider than the 41" rear foot, so the footprint is 48" × 57". Estimates: 560 mm upright spacing, 360 mm arm reach,
stack plate 110 × 250 × 22 mm. Round 2: TITAN letters read correctly on both sides, stack labels moved to the photographed side.

## 5. REP Arcadia Functional Trainer (19) — `rep-arcadia-functional-trainer`

- [Product page](https://repfitness.com/products/arcadia-functional-trainer) (12 photos): 80.8" (78" inverted bar), 170 lb
  stacks (220 lb upgrade), 10 lb steps from 20 lb, 2:1, 32 trolley positions 13"–68"
- [Garage Gym Reviews](https://www.garagegymreviews.com/rep-arcadia-review) (6 photos): 55.3" W × 35.8" D, 42" between uprights

Model: twin metallic-black shrouds with rounded inner top corners and REP lettering, stack visible through the inner window,
outer trolley uprights with laser-numbered stainless strips, trolleys with knurled pull pins and hex-cut pulley housings,
diagonal feet with logo caps, pegboard with two shelves, multi-grip bar (standard humps up / inverted). Estimates: shroud
270 × 320 mm, stack plate 210 × 140 mm.

## 6. Titan Wall and Rack Mounted Pulley Tower 80.5" (19) — `titan-wall-pulley-tower`

- [Product page](https://www.titan.fitness/products/short-wall-mounted-pulley-tower-v3) (24 photos, short and tall):
  80.5"/84.5" H, 25" W × 27.5" D, 2" × 2" tube, 18 trolley positions, 10.25" × 1" weight posts with 2" sleeves, 350 lb, 2:1
- [Operator manual SHPULTWRv3b](https://support.titan.fitness/hc/en-us/articles/25548906770061): front/rear beams, base
  frame, guide tube, front upright, multi-pulley bracket, movable pulley bracket, 13 pulleys, lower/upper wall frames

Model: H base, front upright with 18 holes (3" pitch estimated), rear guide tube with the weight carriage and twin posts,
upper fixing frame and both wall frames, multi-pulley bracket with figure-3 cheeks and twin swivel pulleys, floating pulley pair.
Height is a param (short/tall).

## 7. REP Adonis Cable Tower (18) — `rep-adonis-cable-tower`

- [Product page](https://repfitness.com/products/adonis-cable-tower) (29 images, all variants) and
  [Northern Fitness spec table](https://www.northernfitness.ca/products/adonis-cable-tower): 92.1" H, 54.9" D (footplate in),
  45.5" W with base; 34 trolley positions 14"–79"; 6.3" horn loadable length; 210 lb stack; trolley 2:1, lat/row 1:1
- [Adonis base](https://repfitness.com/products/adonis-cable-tower-base): 45.9" × 23.5" × 14.4", 3" × 3" 11 ga

Model: 3" × 3" uprights 700 mm apart, shroud panels with the central slot, vertical REP lettering and perforated patches,
chrome guide rod with the plate carriage or the 210 lb stack (with 2.5 lb micro disc) and horns through both slots, lat arm,
34-position trolley with twin hex-cut pulley plates, grey tread footplate with row handle, storage base (rails, levelling feet,
storage posts) or anchored foot plates. Width follows the base (45.9") or, without it, an estimated 41" lat bar.

## 8. Inspire FTX Functional Trainer (16) — `inspire-ftx-functional-trainer`

- [Product page](https://inspirefitness.com/products/ftx-functional-trainer) (5 images) plus
  [Fitness Specialist](https://fitness-specialist.com/products/inspire-ftx-functional-trainer) (4) and Exercise Unlimited (2):
  54" W × 40" D × 82" H, 2 × 165 lb, 2:1, 30 swivel-pulley positions
- [FTX owner's manual](https://resources.fitshop.com/pdf/inspire/FTX/FTX_Manual.pdf): stations, lower/upper cross braces,
  pull-up bar, tablet holder; step 2B: fifteen 10 lb plates per stack (15 lb selector)

Model: two towers mirrored and rotated 20° into a V, sled feet with upturned toes, chrome carriage tubes with red lock levers,
pill-shaped plates, INSPIRE top caps with rounded inner corners, arched lower brace, upper brace with the accessory hanger
(rope, belt, curl bar), arched pull-up bar. Estimates: tower angle, 344 mm tower offset. Round 2: angle reduced from 26° and
toes turned outward to match the front photo; footprint depth 1016.7 mm (≈40").

## 9. Bells of Steel Lat Pulldown Low Row Machine (16) — `bells-of-steel-lat-pulldown-low-row`

- [Product page](https://bellsofsteel.com/products/lat-pulldown-low-row-machine) (18 photos): 42" W × 70" L × 87" H, 310 lb
  stack in 10 lb steps or plate loaded (upgrade kit), 1:1, aluminium pulleys, adjustable knee pads, angled footplate

Shared lat-tower builder: bolted two-plate arm, BELLS OF STEEL seat-box lettering, square knee pads, plate-loaded carriage with
cross horns. Estimates: 600 mm upright spacing, 660 mm arm reach, 48" bar.

## 10. Rogue Monster Rhino + INDY Functional Trainer (9) — skipped

Rogue sells this as a configurator bundle on a Monster RM-6/43"-depth rack (92"/102" heights, 12 colours) rather than a
stand-alone machine. Only single-angle configurator renders of the rack bundle and one Gym Radar thumbnail were available — not
eight distinct views of the Rhino + INDY configuration — and the INDY stack towers are rack-mounted, so it belongs with the
rack cable systems. Left on the issue.

## 11. Force USA Functional Trainer Rack (8) — `force-usa-functional-trainer-rack`

Gym Radar's "Force USA Functional Trainer" (8 owners) is the [Functional Trainer Rack](https://www.forceusa.com/products/functional-trainer-rack)
(9 images incl. front and side dimension drawings): exterior 49" W × 43" D × 87" H, interior 43" × 33" × 81"; 3" × 3" 11 ga,
1" holes on 2"; dual 200 lb stacks (250/300 lb), 2:1 freestyle arms on reversible trolleys, aluminium pulleys, pegboard,
shelf. Model: front trolley uprights and stack bays with sloped caps and hex-pattern FORCE USA plates, stacks in the rear
bays, trolleys with freestyle arms (fixed 35° pose; their reach past the 49" frame is part of the footprint), front top
crossmember with suspension ring and pull-up grips, sign, pegboard and shelf. Estimates: bay spacing (from the side drawing),
arm length and pose, stack plate size.

## 12. Major Fitness B52 All-In-One (9) — `major-fitness-b52`

- [Product page](https://www.majorfitness.com/products/all-in-one-home-gym-smith-machine-spirit-b52) (28 renders across
  Standard/Pro/EVO and colours): 78.7" W × 66.9" D × 82.6" H, 43" × 55.2" interior, 2" × 3" 14 ga (Pro 12 ga front, 2" × 2"
  middle), 17 cable / 10 Smith / 14 upright positions, 2:1, plastic (Standard) or aluminium (Pro) pulleys; Tactical Black,
  Recon Desert, Patriot Blue

Model: front/middle/rear uprights, top frame with foam outer handles and angled pull-up grips, Smith rods with springs and
catch-tooth plates, Smith bar whose sleeves set the 78.7" width, J-hooks, dip arms, plate storage pegs, landmine, low-row
footplate, cable trolleys on the front uprights, Standard plate carriages or Pro 170 lb stacks with blue labels, rear
MAJOR FITNESS plate. Colour param paints the uprights. Estimates: upright spacing (from the side render), Pro stack weight
(Major sells a 170 lb stack set), carriage horn layout. EVO flex arms not modelled.
