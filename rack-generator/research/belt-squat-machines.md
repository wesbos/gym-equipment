# Belt squat, calf & tib machines (issue #121)

Sources checked 2026-09-19. Every entry is one catalog part in `floor-parts/belt-squat-machines.ts`, built in
`parts/belt-squat-machines.ts` with the shared kit `parts/belt-squat-machines-kit.ts`. Each machine has a pure layout
function in the metadata file (millimetres, X across, Y floor depth, Z up); the footprint and the builder both read it,
so they cannot drift. Loaded plates are real `buildPlateStack` stacks (IWF colours, `plate` + `loaded` params, the count
limited by each horn's published loadable length); `plateStackBox` reproduces the revolved rim and chamfer corners so
the footprint grows exactly with overhanging plates, and the builder shifts everything so the bounding box stays centred.
Brand names are typeset in the bundled Helvetiker Bold on flat badges (no logo artwork). All machines use `role: 'source'`
factory colours, not rack paint. Popularity from Gym Radar (Sep 2026): Rhino 55, SquatMax-MD 31, Tibia Dorsi 26,
DIY belt squat 23, Tib Bar Pro 20, Single Leg Squat Roller 17, Bells of Steel 17, DIY seal row bench 16, APEX Barrett 15.

## Rogue Monster Rhino Belt Squat, Stand Alone (RF0822) — `rogue-monster-rhino-belt-squat`
- https://www.roguefitness.com/monster-rhino-belt-squat-stand-alone-mg-black (gear specs + description).
- Published: footprint 53 × 60.5 in; tower 78.5 in; platform top 7 in; platform 48.5 W × 26 D in (26.25 in in the specs
  table); two weight posts with 15.75 in loading each; 3×3 in arms and crossmembers; 3×6 in trolley tower; 0.25 in braided
  cable; 1 in UHMW "rhino horn"; 27.5 lb trolley; welded band pegs; medium-gloss black except platform, handles and posts.
- Mechanism (from the description and photos): the belt cable runs through a roller slot in the platform, under to the
  tower and over the top pulley to the trolley. Standing lifts the trolley off the horn; pulling the handle arms back keeps
  them back; pushing them toward the tower lets the horn re-catch the trolley. Param `pose`: racked (arms tilted 14°
  toward the tower, trolley on the horn) or squatting (arms vertical, trolley 7 in up).
- Layout (in, from the front foot tips): front angled feet 0–13, platform 11–37, fixed uprights 37–40 (57 in tall, holes
  every 2 in), swing arms pivot at 41.6 in / 6 in high (51 in long, handle sleeves at 38 in), trolley sleeve at 47 in,
  horn post 47.25–49.25 in, tower 49.5–55.5 in, base band pegs to 60.5 in. Estimates: upright and arm heights, pivot, loop
  handle size (≈ 9 × 6.6 in), trolley plates, rollers, horn shape and pulley bracket outline, from photo proportions
  (tower height used as the scale bar).
- Photos (16, Rogue gallery): belt on platform/roller slot (top), rhino badge, side view loaded (red 25 kg), 3/4 front
  loaded, front feet close-up, trolley and orange-handled horn close-up, bumper on upright, pulley bracket, tower base and
  pegs, handle sleeve with red pop pin, upright numbering, two in-use side/front shots, hero render.

## Titan SquatMax-MD (401933) — `titan-squatmax-md`
- https://titan.fitness/products/squatmax-md (specs table + dimension graphic).
- Published: footprint 45 W × 41 D in; overall height 59.5 in; base (deck) height 20 in; 33 in deck dimension on the
  graphic; centre cut-out 16.25 × 21 in; weight sleeve (pin) 21 in × 48 mm; grip handles 39 in × 32 mm; 197 lb.
- Estimates: deck width 38 in, leg splay to the published footprint, 25 × 20.5 in insert plate, cross carriage (16 in arms,
  "15 LB" etched on the real one), guide frame (32 × 24 in) with paired band pegs, seat post position and 13 in pad at
  ~34 in. The carriage rests 4.5 in above the floor; `pose` lifted raises it 4 in (the stack stays under the deck).
- Photos (14): studio 3/4 with seat, three loaded action shots, loading pin/eye bolt close-up, carriage close-up, belt, seat
  logo, deck lettering and red pop pin, dimension graphic.

## Titan Tibia Dorsi Calf Machine (400843) — `titan-tibia-dorsi-calf-machine`
- https://titan.fitness/products/titan-fitness-tibia-dorsi-calf-machine.
- Published: 35.5 W × 15 D × 12 H in; sleeve height 6.25 in; loadable sleeves 7 in × 49 mm; footplate 14 × 4 in; pad
  14 × 7 in; 200 lb capacity; 55 lb; pillow-block bearings.
- Estimates: pivot at 10 in, 2.75 in behind centre; sleeve 3.9 in in front of / 3.75 in below the pivot; A-frame side
  stands (tall rear bearing post, low front brace so the sleeves pass above it); the diamond footplate inclined 55° up behind the foot to just under the pivot. Param `tilt`
  (toe raise 0/10/20°) swings the cradle and its sleeves about the bearing axis. Plates limited to 25 lb and 10 lb iron
  (a 45 lb or bumper plate would hit the floor at a 6.25 in axis).
- Photos (10 Titan + 6 Gym Radar owner photos, incl. a Bells of Steel clone): 3/4 studio, seated use ×2, foot in cradle
  top view, diamond plate and pad close-ups, bearing close-up, loaded 3/4 ×2, dimension graphic; owners: top view, side
  views loaded and unloaded.

## DIY belt squat (typical build) — `diy-belt-squat`
- https://gymradar.com/equipment/belt-squat-custom-diy (owner photos and review). 18 photos reviewed: split 2×-lumber
  platforms with a centre chain gap (several), a rope/pulley build, a wooden lever with a pipe loading pin, landmine
  levers, a DIY loaded-carry platform plan.
- Representative build (not a published design): two 18 × 30 × 12 in 2×6 boxes with plywood and rubber-mat tops, 9 in gap;
  doubled 2×6 lever hinged 24 in behind centre, 48 in to a 2 in (48.3 mm) galvanised pipe horn with 12 in arms; chain from
  an eye bolt 22 in along the lever to a carabiner at hip height; fold-down rest leg holding the horn axis at 232 mm so
  45 lb / bumper plates just clear the floor. `pose` lifts the lever 12°.

## The Tib Bar Guy Tib Bar Pro — `tib-bar-guy-tib-bar-pro`
- https://www.apexfitness.com/products/the-tib-bar-pro (thetibbarguy.com redirects there). Published only: 2 in Olympic
  plates, "tested up to 150 lbs", stainless screw-in loading bar, weight clamp, foam pads, 6.7 lb shipping weight.
- Estimates from photos (sleeve Ø as the scale bar): 14 in foot bars, 66 mm foam pads, 4.5 in bar spacing, 72° stem, 90 mm
  stem, 95 mm flange, 8 in loading bar, 82 × 40 mm clamp. Modelled resting on its pads as in the product and owner photos;
  plates limited to 25 lb / 10 lb iron (160 mm usable before the clamp).
- Photos (10 manufacturer + 3 Gym Radar owner): hero, infographic, bench tib raise ×2, what's included, easy setup,
  hanging leg raise, loading bar close-up, home use; owners: on the floor ×2, on a rack.

## Titan Single Leg Squat Roller (401479) — `titan-single-leg-squat-roller`
- https://titan.fitness/products/single-leg-squat-roller.
- Published: 24 W × 22 D × 26 H in; roller height 12–25 in; 12 positions, 1 in increments; roller 16 × 4 in; 2 in 11 ga
  tube; 27 lb. The published range and step count are reconciled as roller centre 12–23 in (top 14–25 in).
- Estimates: sliding 2.5 in carriage with pull knob on its front face, 1 in axle, gusset shape, tapered rubber foot caps,
  badge on the crossbar.
- Photos (10): studio 3/4, split squat ×2, adjusting, knob close-up, pad end, foot on roller, foot cap, dimension graphic.

## Bells of Steel Belt Squat Machine 2.0 (BQT-MA-SET) — `bells-of-steel-belt-squat-machine`
- https://www.bellsofsteel.us/products/belt-squat-machine (specs table).
- Published: widest length 81 in (pegs horizontal), narrowest 52.5 in (pegs vertical), width 51 in, height 40 in, loadable
  peg 13.5 in, 700 lb capacity, 40 lb empty, 13 heights, Zerk bearings, band pegs.
- Layout: 38 × 35 in platform, 16 in rear tower with 3×3 posts and braces, twin 2×3 arms on four green pillow blocks at
  19 in high, 33.5 in to a 52.5 in horn crossbar; uprights 6 in in front of the tower pivot on base bearings, pass through
  sleeves on a badge crossbar and carry the grab bar; the height pin is the lever stop. Param `horns` (horizontal /
  vertical pegs), `pose` (resting at +7° / bottom at −8°). Vertical-peg bumpers overhang the frame and grow the footprint.
- Estimates: platform size, arm spacing, pivot height, crossbar positions, bracket size, chain hook.
- Photos (10 Bells of Steel + 2 owner): studio 3/4 and front, loaded front/back/side in use, four-exercise grid, bearing and
  peg close-up, top view of the bearings and badge, unloaded side; owners: loaded 3/4 and front.

## APEX Barrett Belt Squat — `apex-barrett-belt-squat`
- https://www.apexfitness.com/products/apex-barrett-belt-squat-machine (spec card; images are pre-production).
- Published: 31 L × 19.5 W × 26 H in; storage 12 × 19.5 × 31 in; loading bar 15.5 in × 2 in; handle 19.5 in × 1.25 in;
  9 handle heights, 5 handle angles; 16 in kickstand; 25 lb; 450 lb; 66 in lever when mounted on the APEX Adjustable Bench.
- Modelled as the attachment standing on its kickstand at bench-spine height (the bench is the separate
  `apex-adjustable-bench` entry). Estimates: beam height 5 in, bracket plates, stainless tongue length, EZ-clip angle,
  handle travel 1 in per level (level 5 = published 26 in). Storage mode is not modelled.
- Photos (8 APEX renders/infographics + 1 Gym Radar owner photo).

## DIY seal row bench (typical build) — `diy-seal-row-bench`
- https://gymradar.com/equipment/seal-row-bench-custom-diy (owner photos and review: "6-foot 2×10, 2 sawhorses rated at
  500 lb, a cheap yoga mat and about 5 rolls of electric tape"). 17 photos reviewed: plank on folding sawhorses, padded
  boards across rack safeties, benches on wooden cribs.
- Representative build: 2×10 plank (9.25 × 1.5 in) wrapped in a 5 mm black mat with tape bands every ~9 in, on two black
  folding plastic sawhorses (27 in top beam, 10 in leg splay, tray with load label). Params: pad height 30/33/36 in and
  plank length 60/72/96 in.

## Not modelled
- Freak Athlete Nordic / tib machines: Freak Athlete sells no tib machine; its Nordic Mini Pro (4 store images) is a
  hamstring Nordic anchor that belongs with the Nordic/GHD family, and the FA Apex is a GHD. Left for that family.
