# Floor storage reconstruction (#123)

Plate trees, barbell holders and dumbbell/kettlebell racks, highest-owned first (Gym Radar counts, Sep 2026). Sources checked
2026-09-19. Metadata and every published/estimated number live in `floor-parts/floor-storage.ts`; builders in
`parts/floor-storage-trees.ts` (horn trees, Titan bar holder) and `parts/floor-storage-racks.ts` (dumbbell racks, cart, stand,
kettlebell rack) on the shared `parts/floor-storage-kit.ts` (built on the wall-storage `Kit`).

Axes: X across the product (horns, shelf length), Y depth with −Y the loading side, Z up; origin on the floor at the footprint
centre. Every footprint is the product's published envelope and never changes with a `loaded` param — stored loads stay inside
it (the only footprint param is the REP cart's pegboard hooks, which stick out of the side panels).

Stored loads reuse other families' data rather than inventing sizes:

- **Plates** go on horns through `buildPlateStack` (48 segments) with only its public options: bumpers 25/20/15 kg and iron
  45/35/25 lb, heaviest on the bottom tier. `hornLoad` fits as many as the published usable horn length holds (full) or half of
  that (half). The plate bore rests on the horn top (centre dropped by (50.4 − horn OD)/2).
- **Bars** are the wall-storage low-poly men's 20 kg bar (`olympicBar`, `BAR` constants), standing sleeve-down, alternating hard
  chrome / black oxide.
- **Dumbbells**: REP rubber hex dumbbells are the real `buildFixedDumbbell` geometry (labels off, ~1.9k triangles each).
  Rogue urethane (30 on one rack) would cost ~9k triangles each, so they are a low-poly revolve using the fixed-dumbbell
  family's published Rogue head Ø / length / 6″ handle table. PÉPIN (cart) and PowerBlock (Titan stand) reuse their builders.
- **Kettlebells**: low-poly bells from the kettlebell family's solved REP layouts (`repBell(…).layout`: body Ø, handle path,
  REP kg band colours) — truncated sphere + hull-of-spheres handle.
- Standard 1″ plates (Titan stand pegs) are not in the shared plate table: rubber grip plates estimated at 25 lb 12″ × 1.4″,
  10 lb 9″ × 1.05″, 5 lb 7.75″ × 0.85″ (CAP/Titan standard plate listings; estimate).

Brand lettering (ROGUE, TITAN, REP) is typeset in the bundled Helvetiker Bold — no logo artwork is copied.

## 1. Rogue Vertical Plate Tree 2.0 (81) — `rogue-vertical-plate-tree-2`

Source: [roguefitness.com/rogue-vertical-plate-tree-2-0](https://www.roguefitness.com/rogue-vertical-plate-tree-2-0) (RF0644).
Photos looked at (7 manufacturer images incl. studio iso, wall-gym front with and without wheels, loaded with bumpers, gusset
close-up, post end close-up, caster close-up) plus the render-vs-photo side-by-sides below.

Published: 26″ L × 24″ W × 50″ H; six 12″ storage posts, Schedule 40 1.5″ pipe = 1.9″ OD; 18.275″ tier spacing on centre;
fits IWF 450 mm plates on all three tiers; bolt-together "reinforced triangle-plate base"; optional set of four casters.

Estimates: 2×3″ 11 ga upright (Monster Lite section) with a column of six 1″ holes on its side faces between the upper tiers;
H base: two 24″ × 3″ × 2″ feet along X with 1″ holes on their faces, a 24″ spine along Y; 7″ × 9″ gusset plates (6 mm) with
four bolts each on the upright faces over the spine; bottom post 11.2″ so a 450 mm plate clears the 2″ base; caster set
3″ wheels, 4″ tall. ROGUE lettering vertical on the upright's front face between the lower tiers.
Params: plates (empty / half / full), plate type (bumper kg / iron lb), wheels.

## 2. Titan Barbell Storage Holder (78) — `titan-barbell-storage-holder`

Source: [titan.fitness/products/vertical-barbell-storage-rack](https://www.titan.fitness/products/vertical-barbell-storage-rack)
(5-sleeve 400346, 9-sleeve 401151). Photos looked at (18): both sizes studio iso, dimension graphics (12″ and 19″), loaded with
3/5/9 bars, liner close-ups, removed insert, lettering close-ups, open-side view of the tubes and base plate.

Published: 5 sleeves 12″ × 12″ × 9″, 19 lb; 9 sleeves 19″ × 19″ × 9″, 40 lb; 51 mm bar hole; 9 ga tubes, 3 ga base,
powder-coated black; plastic sleeve inserts.

Construction read from photos: a 3 ga base plate, a bent cover (top + two side walls, open on the other two sides), vertical
tubes base-to-top, flanged black nylon inserts proud of the top, TITAN lettering cut through each wall, a relief notch in each
wall's bottom edge. Estimates: sleeve grid pitch 3.25″ (5: four corners + centre) and 5.5″ (9: 3 × 3), tube OD 2.375″, liner
rim Ø74 × 11 mm, notch 5″ × 0.6″. Params: size, stored bars (0 … sleeves, centre first).

## 3. REP Dumbbell Rack (52) — `rep-dumbbell-rack`

Source: [repfitness.com/products/dumbbell-storage-rack](https://repfitness.com/products/dumbbell-storage-rack) (Shopify JSON:
14 images). Photos looked at (14): metallic, red, blue, matte studio shots, three three-quarter views, loaded with the
5–50 hex set, logo gusset/foot close-up, tray bracket close-ups, lip close-up, front view.

Published: 36″ H × 48″ L × 24″ D, 75 lb; 11 ga shelves with a 1″ lip; usable shelf 42.5″, 4.5″ grab space, 10″ resting space;
colours Metallic Black, Red, Blue, Matte Black; sized for the REP 5–50 lb rubber hex set.

Estimates: end frame = 2.25″ × 2.5″ foot with tapered rubber caps, an angled 2″ front leg and near-vertical rear post meeting
under a top cap, a 10″ tall logo gusset (REP lettering) between them at the foot; each tier is a front and a rear formed
channel with the published 4.5″ grab gap between them (10″ resting depth), tilted 12° (rear up) at 7.5 / 19.5 / 31.5″, front
edges 3.9 / 6 / 7.5″ ahead of the front leg so the 15″ long 50 lb heads stay inside the feet; end plates tie both channels and
bolt to the inside of each leg. Loaded pairs lie across X (across-corners widths from the REP hex table) with 3 mm gaps:
50/45/40 bottom, 35/30/25 middle, 20–5 top; each head bridges the lips of its channel.
Params: colour, dumbbells (empty / 5–25 lb pairs / 5–50 lb pairs).

## 4. Titan Portable Weight Plate & Barbell Storage Tree (51) — `titan-portable-plate-barbell-tree`

Source: [titan.fitness/products/portable-plate-barbell-storage-tree](https://www.titan.fitness/products/portable-plate-barbell-storage-tree)
(401919). Photos looked at (8): studio iso, loaded with bumpers and two bars (×3), lifestyle loading/unloading ×2, caster close-up,
dimension graphic.

Published: 24.5″ × 24.5″ × 57.625″; six posts 50 mm Ø with 8.25″ loadable sleeves; 18.5″ tier spacing; two vertical bar
sleeves 52 mm × 7″; locking casters; 1,000 lb capacity, 54 lb.

Estimates: 2.5″ square upright and base tubes; H base (feet along X with casters at the ends, spine along Y), bar sleeves on the
spine 4.5″ either side of the upright; 2.5″ casters 3.6″ tall; bottom post 14.3″ above the frame; small gussets.

## 5. REP Bar & Weight Plate Tree (48) — `rep-bar-weight-plate-tree`

Source: [repfitness.com/products/bar-and-weight-plate-tree](https://repfitness.com/products/bar-and-weight-plate-tree) (7 images).
Photos looked at (7): studio iso ×2, gym front, base close-up with sleeves and gusset, loaded with 25 kg plates + bar, loaded
10/15/20 kg with bars, fully loaded with two bars. Fewer than 8 manufacturer images exist; the base close-up and three loaded
shots cover the joints, sleeves and foot caps.

Published: 24″ × 24″ × 50″, 35 lb, six horns with 8″ usable length per side, two barbell holders, 850 lb capacity.

Estimates: 2×3″ upright, H base with 3 × 2″ feet along X and chamfered rubber end caps, embossed REP lettering on the front foot,
8″ triangle gussets on the upright's X faces over the spine, bar sleeves 2.5″ OD × 7″ tall 6.25″ from centre; tiers at 10 /
28.5 / 47″; black horns with bright tips (the listing says chrome-coated horns; photos show black with a bright end).

## 6. REP Dumbbell Storage Cart (47) — `rep-dumbbell-storage-cart`

Source: [repfitness.com/products/rep-dumbbell-storage-cart](https://repfitness.com/products/rep-dumbbell-storage-cart)
(24 images). Photos looked at (16): metallic-black with hooks, white, matte, studio three-quarter ×3, caster close-up, liner
and plate-slot close-ups, cradle mounting, hooks with handles, lifestyle ×5.

Published (Tech Specs): 32″ W × 23.3″ D footprint, 20.75″ floor to top lip, 94 lb, 500 lb capacity; 11 ga top and 12 ga bottom
shelves, 16 ga frame; crumb rubber liners; four locking casters; pegboard sides with optional six hooks; colours Metallic Black,
White, Matte Black; holds a REP x PÉPIN FAST (or QuickDraw) pair in their bolted-down cradles.

Estimates: 1.5″ corner posts, 2″ top-shelf skirt, 11″ × 7.5″ step-in cut-out, bottom shelf at 6″ with a 5″ cut-out, 1/4″ holes
on a 1″ grid, 3″ casters 4.25″ tall, four add-on plate slots in the top liner, REP badge on the flared front bracket, hooks 3.5″.
White colourway: white frame posts, black pegboard and shelves (photo). Params `dumbbells` (empty / PÉPIN FAST / QuickDraw,
both reusing their family builders, racked) and `set` (65–125 or 30–60 lb per hand).

## 7. Titan Dumbbell Stand & Plate Tree (30) — `titan-dumbbell-stand-plate-tree`

Source: [titan.fitness/products/dumbbell-stand-plate-tree-power-block-v3](https://www.titan.fitness/products/dumbbell-stand-plate-tree-power-block-v3)
(420044). Photos looked at (9): studio iso, dimension graphic, loaded with 60 lb urethane dumbbells and plates ×2, platform
close-up, peg with plate close-ups ×2, ribbed foot cap close-up.

Published: 28.125″ H × 23.5″ W × 26″ D; two dumbbell rests 8.25″ × 19.5″ with 1.375″ lip; weight sleeves 6.5″ × 25 mm;
260 lb capacity, 40 lb; angled top platform; fits PowerBlocks (not at the heaviest setting).

Estimates: two A-frames of 1.5″ tube on 2″ feet (23.5″ incl. ribbed caps) joined by a crossbar; pegs at 10″ and 14″ (staggered
so 25 lb plates on neighbouring pegs clear); 8° platform tilt, front lower; TITAN lettering and red badge on the front leg.
Params: dumbbells (empty / 60 lb urethane pair — REP urethane head sizes / PowerBlock Elite USA 90 pair), standard plates.

## 8. Kettlebell storage — REP Kettlebell Rack 2.0 — `rep-kettlebell-rack-2`

Source: [repfitness.com/products/kettlebell-rack-2-0](https://repfitness.com/products/kettlebell-rack-2-0) (10 images).
Photos looked at (10): two- and three-tier studio shots, loaded two-tier and three-tier lifestyle ×5, end cap close-up,
liner hex pattern close-up, shelf edge close-up.

Published (Tech Specs): two-tier 51.41″ × 23.25″ × 30.84″, three-tier 51.42″ × 23.25″ × 33.60″; 1500 lb per shelf; 11 ga
frame; flat shelves (not angled); moulded plastic liners; set range double KB set 4–24 kg.

Estimates: 2 × 3″ zig-zag frame tube from each foot through a support arm under every shelf; shelves 49″ long with
0.75″ rolled lips and 1.2″ end caps carrying REP lettering; two-tier shelves 12.5″ deep at 14.5/30.1″ (the depth at which the
published double 4–24 kg set fits two staggered rows), three-tier 8.25″ at
7/20.1/32.85″. `packBells` puts the heaviest bells on the bottom shelf and staggers front/back rows where the shelf is deep enough;
both the single (11) and double (22) 4–24 kg sets fit either rack.

## 9. Rogue 3-Tier Dumbbell Rack — `rogue-3-tier-dumbbell-rack`

Source: [roguefitness.com/rogue-3-tier-dumbbell-rack](https://www.roguefitness.com/rogue-3-tier-dumbbell-rack) (XX11789).
Photos looked at (9): studio iso ×3, dimension graphic, front view, saddle/rail close-ups ×2, foot plate close-up, end plate
lettering close-up.

Published: 93″ L × 30″ W × 33″ H, 269 lb; 0.375″ laser-cut steel end plates; 10 positions per tier, 30 dumbbells (15 pairs);
plastic saddles; centre rail divider; bolt-down foot plates; ships assembled; for Rogue urethane dumbbells.

Estimates: end-plate outline (arched opening between front/rear legs, stepped tier noses, three windows, cut ROGUE lettering),
tier rail tops 9 / 21 / 32″ with centre lines at −8 / −0.5 / +7″, 9″ between the front and rear saddle rows, 2″ rails with a
downturned flange, saddles 3.8″ × 2.4″ × 1.25″ with a concave seat. Loaded: lightest pairs on the top tier (5–25, 30–50, 55–75 lb).

## 10. Yes4All Vertical Barbell Storage Rack (22) — `yes4all-vertical-barbell-holder`

Source: the Yes4All Deluxe Vertical Barbell Holder, 5 bars (model RW6H, UPC 810019296963), sold on Amazon
([B07WFB6Z93](https://www.amazon.com/dp/B07WFB6Z93), reachable directly this time) and the item Gym Radar links
([gymradar.com/equipment/vertical-barbell-storage-rack](https://gymradar.com/equipment/vertical-barbell-storage-rack)); yes4all.com
has no shop. The 9-bar flat-plate variant (B07KP8PVV4) is a different product. Photos looked at (16): nine Amazon images (hero
three-quarter, dimension diagram, bar insert, low three-quarters, loaded lifestyle, near side elevation, before/after) and seven
Gym Radar owner photos (logo side loaded, open end with the base tray and weld beads, liners close-up, top view of the hole layout).

Published: 12″ × 12″ × 7.5″ overall; 11.75″ × 11.75″ box body 6.05″ to the top plate (dimension image); 2″ liner bore ("fits most
bars 2 inch or less"); five bars; heavy-gauge steel; 100 lb capacity; weight listed both as 30.86 lb and 10.02 kg (conflict).

Construction read from photos: a 12″ base tray with ~15 mm upturned lips on the two open ends, a shell of top plate and two side
walls with the Yes4All logo cut through, five tubes welded to the tray and passing through the top plate, flanged black plastic
liners standing proud to the published 7.5″, a chamfered relief notch in each wall's bottom edge. Estimates: quincunx corner
pitch 152 mm (owner top view: 235 px against the 455 px 11.75″ edge), tube OD 61 mm, liner flange Ø63 mm (1.24 × the bore in the
hero image), notch 150 × 9.5 mm, 3 mm sheet. The logo is typeset (Helvetiker), not the artwork. Params: stored bars 0–5.

## 11. CAP A-Frame Olympic Plate Tree (20) — `cap-a-frame-olympic-plate-rack`

Gym Radar's item ([a-frame-olympic-plate-tree-rack](https://gymradar.com/equipment/a-frame-olympic-plate-tree-rack)) mixes two CAP
racks: its main image, price link and three of four owner photos are the welded 7-post **RK-2A**, the fourth is the bolt-together
5-peg **RK-2BB** the earlier pass looked at. Both ship as the `model` param (RK-2A default, as most owners have it).

- **RK-2A** — Amazon [B0013SZC8S](https://www.amazon.com/dp/B0013SZC8S): 37″ H × 19″ W × 22″ D, 500 lb. Photos (8): CAP gallery
  (3 incl. a straight front elevation and a base close-up), Amazon studio three-quarter, Gym Radar main image and three owner
  photos (empty front, loaded front and three-quarter). Estimated from the front elevation (≈ 2.6 mm/px): legs from ±200 mm at the
  feet to the apex, 25 × 50 mm tube; welded mid crossbar at 470 mm; side pegs right 880 / 675 / 415 mm and left 845 / 495 mm with
  tips at the published 19″ width; vertical posts on the base crossmember (100 mm) and the mid crossbar (90 mm); 40 × 45 mm feet
  with ribbed black end caps.
- **RK-2BB** — [capbarbell.com](https://www.capbarbell.com/products/cap-a-style-olympic-plate-storage-rack) (2 photos), the
  RK-2B/RK-2BB assembly manual (1 triangle frame, 2 base feet, 5 × 2″ pegs, 25 mm caps, 25 × 50 mm tube, 4 × M10×70 and 5 × M10×35),
  Amazon [B00ZEYG9WK](https://www.amazon.com/dp/B00ZEYG9WK) (7 images incl. the dimension diagram: 30″ H, 19.9″ W, 12″ D, 4″ side
  pegs, 4″ centre post; 13.88 lb; capacity listed 300 and 650 lb), one Gym Radar owner photo. Estimated from the front elevation
  (1.33 mm/px across, 1.37 mm/px up): legs raked 12.5° from ±171 mm to a flat top cap, foot tubes flat 50 × 25 mm on ±227.5 mm,
  crossmember on the feet between twin tabs with two bolts a side, pegs upper z 698 mm (root 49 → tip 159 mm) and lower z 292 mm
  (138 → 240 mm) on saddles, all capped.

Loaded views hang iron plates face-on across X (as in the lifestyle photos) — RK-2A 45 / 35 / 25 lb by tier, RK-2BB 25 / 10 lb, a
flat 10 lb stack on the bottom post — inside the footprint; a peg's stack stops short of the plates of a lower peg on the same side.

## Not shipped

Nothing: every product in #123 now ships.
