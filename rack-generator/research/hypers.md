# Reverse hypers, GHDs and back extensions (#119)

Sources checked 2026-09-19. Photos were downloaded and reviewed as contact sheets; counts are photos actually looked at.
Design axes for every builder: X across the machine, +Y toward the handles / footplate / head end, Z up, origin at the
footprint centre on the floor. Everything that moves (pendulums, carriages, pads) is solved in the pure layout functions in
`floor-parts/hypers.ts`, so each footprint is the exact bounding box of the build for every param value (tests check 0.5 mm).
Frames are factory black and use role `source` (rack paint never recolours them); pads `liner`, grips `handle`, hardware `fastener`.
Brand wordmarks are letter-shaped blocks or plain badges, never copied artwork.

## Westside Barbell Scout Hyper (Rogue) — `rogue-westside-scout-hyper` (142 owners)
- [Rogue product page](https://www.roguefitness.com/westside-scout-hyper) (22 gallery images, WESTSIDEGROUP-H/WEB1–21) and
  [Garage Gym Reviews review](https://www.garagegymreviews.com/rogue-westside-scout-hyper-review) (12 photos incl. an orthographic side view, folded carry, pop pin, strap, feet, handles). 34 photos.
- Published: pad 27.5 × 21.5 × 2 in round-edge; pad top 46.5 in; width 27.5 in (pad) / 32 in over the pop pins; length 38 in including
  the handles; weight posts 5.25 in loadable; swing-arm capacity 176 lb; 6 in handles; black with white Westside Barbell branding.
- Published footprint "60 × 27.5 in at the feet" does not match any photo: two independent side views (GGR orthographic and Rogue's
  studio shot) both scale the foot spread to 43–47 in against the 46.5 in pad height. The model uses the photo geometry
  (feet at −488 / +599 mm, ≈ 1207 mm overall including the handle tips); the 60 in figure is treated as a swing/use clearance.
- Scissor legs 2 × 2 in, rear-foot pair outboard (tops slide in the patented groove, locked by the pop pins), front-foot pair inboard,
  crossing pivot bolts, rubber boots, front crossmember and rubber-covered rear step; 6 mm side plates with rounded bottom corners,
  white two-line wordmark blocks and a warning label; pendulum pivot 960 mm, 38 mm arm, 49 mm posts at 471 mm, D-ring and webbing loop.
- Params: pendulum swing −15…60° (plates and strap swing about the pivot), plate load (limited by the 5.25 in posts and 176 lb).
- Estimates: tube gauges, hidden cross tubes, leg hole pattern, strap drape (stadium loop), handle X spacing (±230 mm). Not modelled: the folded pose.

## Freak Athlete Hyper Pro — `freak-athlete-hyper-pro` (128)
- freakathlete.com now serves the Hyper Pro X; the Hyper Pro (formerly Nordic Hyper GHD) was sourced from
  [Garage Gym Reviews](https://www.garagegymreviews.com/freak-athlete-nordic-hyper-ghd-review) (14 photos incl. the 11-machines studio render)
  and [Gray Matter Lifting](https://graymatterlifting.com/freak-athlete-hyper-pro-review/) (12 photos: side views at 0°, 20°, 45°, GHD setup, U-frame, wheels, footplate). 26 photos.
- Published: 60 × 22 × 23 in flat (Nordic), vertical storage 22 × 23 in, 108 lb, 14-gauge base and tubing, 8-gauge footplate,
  12 height adjustments, incline in 5° steps, colour-coded pop pins, wheels, XL rollers, split end pad.
- Model: 2 × 3 in floor spine, front semi-elliptic arc with transport wheels on tabs, rear U with rubber feet; a carriage (slide tube,
  riser, beam) pivots at the front bracket and is propped by a telescoping strut (black sleeve, zinc inner) from the rear U;
  roller post slides along the slide tube (stations 20 mm apart), 8-gauge footplate reaches 23 in; main pad + split end pad with
  orange FREAK ATHLETE letter blocks; knobs purple / blue / yellow / red / green / white as photographed.
- Params: setup (Nordic/back-extension bench or GHD), incline 0–45° (bench only), roller station 1–12 (stations that would push the
  footplate into the floor at steep inclines are dropped).
- Estimates: GHD lift (500 mm) and pad shape, strut anchor and carriage attachment points, roller Ø 128 mm, pad sizes. The 5 decline steps of the 14 "incline levels" are not modelled.

## Rogue Abram GHD 2.0 — `rogue-abram-ghd-2` (34)
- [Rogue](https://www.roguefitness.com/rogue-abram-glute-ham-developer-2-0) (5 images) + [GGR review](https://www.garagegymreviews.com/rogue-abram-ghd-2-0-review) (11 photos). 16 photos.
- Published: 73 × 44.5 in, 222 lb, 2 × 3 in 11-gauge, 3/16 in 20 × 14 in footplate, rollers 8 5/8 × 5 in Ø spaced 8 in on centre,
  10-slot swing-arm roller assembly, hip pad 16 L × 10.5 W × 9 H in (split), wheels and handles.
- Model: triangular (V) base rails from a narrow front to the 44.5 in rear, cross members with gussets, front wheels; front upright with
  ten-slot quadrant plates; chassis at 440 mm; roller carriage; humped D-profile pads (one per side); handle bars along the pad; ROGUE post text.
- Estimates: pad apex 1105 mm (scaled), chassis height, swing arm simplified to a sliding carriage (10 stations × 20 mm).

## REP Fitness GHD — `rep-glute-ham-developer` (33)
- [REP product JSON / gallery](https://repfitness.com/products/ghd-glute-ham-developer) (10 images: studio 3/4 and side, carriage, rollers, footplate, step, feet/wheels), specs via retailer listings. 10 photos.
- Published: 70 L × 36 W in, 42 in to the top of the pads, 20 × 13 in footplate, 13 adjustment points, bearing carriage, mounting footplate/step, rear wheels, band pegs.
- Model: H base with angled sled feet, rear wheels and band pegs, front upright + pad post, chrome carriage rails on the top rail, mid rail with diamond step, 4 in pleated rollers, diamond footplate with REP badge, humped pads.
- Estimates: rail heights, roller Ø 102 mm, pad sections 190 mm wide each, 25 mm station pitch.

## Titan Roman Chair Back Hyperextension — `titan-roman-chair-back-hyperextension` (25)
- [Titan product JSON / gallery](https://titan.fitness/products/back-hyperextension) (10 images incl. dimension drawing, knob, pads, footplate, handles). 10 photos.
- Published: 52 × 32 in, 250 lb capacity, 50 lb, 2 in 11-gauge frame, adjustable torso length 34–43 in, pads 11.5 × 9 × 2 in, footplate 20 × 12.5 in diamond tread, Y-frame base.
- Model: spine, 32 in front cross foot, rear arc, 45° telescoping post with screw pop-pin knob, carrier with two pads, curved grip handles, 45° diamond footplate with lip.
- Estimates: rear arc radius, post base position, handle bends. Param: footplate-to-pad 34–43 in.

## Titan H-PND — `titan-h-pnd-reverse-hyper` (24)
- [Titan product JSON / gallery](https://titan.fitness/products/h-pnd) (12 images incl. dimension drawing). 12 photos.
- Published: 44.5 in high, 41 × 52.25 in, 10 in × 49 mm loadable sleeve, 8 × 2 × 2 in steps, user 400 lb, plates 700 lb, 250 lb, hyper strap, spring collars, rubber feet, cross brace.
- Orientation note: Titan's dimension graphic is ambiguous about which face is 41 in; the H-PND is treated like the RH-2 it follows (52.25 in along the user, 41 in across).
- Estimates: frame lean, pad 34 × 23 in (spans the frame, as photographed), pivot 950 mm, twin telescoping handle beams (default extension), TITAN plates with cut letters.

## Rogue RH-2 Reverse Hyper — `rogue-rh-2-reverse-hyper` (23)
- [Rogue](https://www.roguefitness.com/rogue-reverse-hyper-2) (5 images incl. an orthographic side view and annotated 3/4 view) +
  [Garage Gym Builder](https://garagegymbuilder.com/rogue-rh2-reverse-hyper/) (4 photos). 9 photos.
- Published: 52.5 × 40 in, 44.5 in, 206 lb, 2 × 3 in legs and swing arm, 2 × 2 in base, 3 in cornered pad, 1 in handles with 6 in grips and multiple hand holds, 10.5 in horns, axle collars, Spud strap, welded steps.
- Model: side rails on rubber feet, 2 × 3 in A-frame legs leaning in to ROGUE plates (cut letters, zinc bolts), pad, cross tubes, pendulum, rear steps, U-bar handles with two angled uprights each.
- Scale 1.52 mm/px from the orthographic side photo (pad top 44.5 in). Estimates: pad width 24 in, handle X spacing.

## Titan Economy H-PND — `titan-economy-h-pnd` (18)
- [Titan product JSON / gallery](https://titan.fitness/products/economy-h-pnd) (10 images incl. dimension drawing). 10 photos.
- Published: 44.5 in, 55 × 39 in base, 2 × 2 in tubing, 10 in × 49 mm sleeve, 300 lb user / 550 lb plates, 147 lb, eight handle positions, spring collars.
- Model: as the H-PND with 2 × 2 in legs, boxed pad frame with a silver TITAN FITNESS badge, adjustable pendulum, rear steps, cross brace.

## Body-Solid GHYP345B — `body-solid-ghyp345-back-hyperextension` (15)
- [Body-Solid](https://bodysolid.com/body-solid-back-hyperextension) specs; [Fitness Supply gallery](https://fitnesssupply.com/products/body-solid-back-hyperextension-o2ad8) (14 images: studio, side views in use, pads, knob, footplate). 14 photos.
- Published: 53 L × 29 W × 36 H in, 68 lb, 2 × 3 in tubing, 3 in DuraFirm pads, footplate to top of thigh pad 35–44 in, pop-pin adjustment, 45°.
- Model: spine with rear U-fork, 45° telescoping post (black sleeve, zinc inner with holes), knob, twin bolster pads with script badge, side grips, angled diamond footplate with heel lip.

## Rogue Donkey — `rogue-donkey` (15; the issue's "Donkey Calf / hip machine")
- [Rogue](https://www.roguefitness.com/rogue-donkey) (16 images: annotated 3/4 view, in-use sides, pads, plates, collars, strap, feet, swing-arm plate, footplate). 16 photos.
- Published: 73 × 44 in, 54.5 in at the footplate, 45 in pad, 500 lb, 3 × 3 in 11-gauge base, pads 3.5 in thick and 34 in across with removable middle insert and front lip, 10 swing-arm settings (+3 vertical), 10.5 in horns, front and rear steps, diamond footplate with side handles.
- Model: Z Hyper-style A-frames and ROGUE plates, three-piece pad, pendulum with red axle collars, extended base with GHD swing-arm quadrant, carriage and footplate with side handles. Estimates: A-frame leg stations, pivot 990 mm, vertical swing-arm options not modelled.

## Rogue GH-1 GHD — `rogue-gh-1-ghd` (14)
- [Rogue](https://www.roguefitness.com/rogue-gh-1-ghd) (5 images incl. the dimension graphic), [Two Rep Cave](https://www.tworepcave.com/5580/expert-guide-to-rogues-4-glute-ham-developers/) (2), [FitKit UK](https://www.fitkituk.com/strength-c2/benches-c11/rogue-gh-1-glute-ham-developer-p4953) (1); Abram photos used for shared base details. 8 photos.
- Published: 68.5 × 45 in, 43 in pad, 49 in footplate top, 195 lb, 2 × 2 and 2 × 3 in 11-gauge, triangular base, rubber feet, 1 in roller increments, 3/16 in oversized footplate; optional wheel kit (not modelled).
- Estimates: 11 roller stations, rail splay, pad size taken from the Abram spec.

## Bells of Steel Reverse Hammer — `bells-of-steel-reverse-hammer` (14)
- [Bells of Steel product JSON / gallery](https://bellsofsteel.us/products/reverse-hammer) (9 images incl. an orthographic side view and a rear view). 9 photos.
- No assembled dimensions are published (the page lists only shipping boxes; the largest is 69 in). Scale taken from the side photo with the pad top assumed 42 in (1.98 mm/px), giving a 1750 mm base consistent with the 69 in box.
- Model: A-frames, three-piece pad with removable crotch pad, chain-and-belt pendulum with horn, diamond steps, rear side handles, GHD carriage on chrome rods over a base extension with front wheels, diamond footplate with side handle.
- Estimates: everything dimensional beyond the photo scale; horn length 230 mm; 10 carriage stations.

## Shared plate loads
Horn loads are per side: unloaded, 10/25/45 lb iron, 2 × 45 lb, 10/20/25 kg bumpers, 2 × 20 kg — filtered per machine by loadable horn length (with 12 mm for a collar) and rated capacity, drawn with `buildPlateStack` and spring or axle collars.
