# Catalog leftovers (#176)

Products that other family agents skipped because they needed a different part kind: landmine handles and a floor
landmine from #134, the Rogue strips from #135, the TSS Combo Rack from #130, the Theraband FlexBar from #127 and the
Freak Athlete Nordic Mini Pro from #121. They ship as a new `leftovers` family: seven floor parts
(`floor-parts/leftovers.ts`, builders in `parts/leftovers.ts` and `parts/leftovers-machines.ts`) and two wall parts
(`wall-parts/leftovers.ts`, builder `parts/leftovers-wall.ts`).

Sources checked 2026-09-19. Photos were downloaded to the agent scratchpad and reviewed as contact sheets and close-ups.

## Titan Viking Press Landmine Handle (`titan-viking-press-landmine-handle`)

- Source: [Titan product page and spec table](https://titan.fitness/products/neutral-grip-viking-press-landmine-handle-v2) (`products/…json` for the gallery).
- Photos (10): studio front, two overhead-press lifestyle shots, floor row, grip close-up, bar-loaded floor view, stop-knob
  close-up, two pressing shots, and the dimension drawing.
- Published: overall length 26.5", overall height 16", grip diameter 50 mm, handle length 9.5", 7.5" between the top grips,
  handle spacing 8.5" and 21.5" (post centres), installation sleeve 50 mm × 5", 11 ga powder-coated black steel,
  680 lb capacity, 17 lb.
- Built as: a crossbar with four posts and two top grips, all 50 mm tubes, frame lying flat; the top grips overhang the
  outer posts by 2.5" exactly as in the drawing. Crossbar-to-grip reach = 16" − 5" sleeve − one tube.
- Estimated: sleeve OD 60.3 mm (ID 51.8 mm), threaded stop-pin position (32 mm from the open end) and T-knob size.
- Loaded pose: a men's 20 kg bar through the sleeve, its end 4 mm short of the crossbar. The bar axis is the sleeve axis
  (30 mm up), so the bar's far collar floats 2 mm; the handle is shown in its floor-row pose.

## Rogue Parallel Landmine Handle (`rogue-parallel-landmine-handle`)

- Source: [Rogue product page, gear specs and comparison table](https://www.roguefitness.com/rogue-parallel-landmine-handle).
- Photos (13): standard and fat-grip hero composites, three bar-loaded studio shots each, handle/cap close-ups, bore-ring
  close-ups (both grips) and the spec graphic.
- Published (comparison table): handle length 8.75", handles 10" on centre, barbell centre to handle centre 10",
  total depth 9.25", width × height 11.75" × 12.25" (standard, 32 mm) and 12.5" × 12.5" (fat, 48 mm), 0.25" laser-cut
  plates, textured black powder coat, 11.5 / 13.5 lb.
- Built as: two ¼" plates perpendicular to the bar, each the hull of the two handle ears and the bore lug with a
  concave saddle between the ears (as in the photos). Ear radius = width/2 − 5", lug radius = height − 10" − ear, so
  both published envelopes come out exactly.
- Estimated: saddle radius (4.2") and depth (2.1" below the handles), the two trapezoid windows under the lettering, bore
  (52 mm) with 7 mm collars, end caps. The laser-cut ROGUE lettering is a grey badge.

## Titan Straight Landmine Handles (`titan-straight-landmine-handles`)

- Source: [Titan product page and spec table](https://titan.fitness/products/straight-landmine-handles).
- Photos (8): studio, four lifestyle rotations/rows, grip close-ups and the dimension drawing.
- Published: overall length 30", handle length 7", 29 mm rubber grips, sleeve 3.5" × 50 mm, powder-coated black
  steel, rubber handles, 8.5 lb.
- Estimated: 22 mm arms, 9.5" rise from the sleeve axis to the grips (drawing proportions), 60.3 mm sleeve OD.

## Rogue Post Landmine (`rogue-post-landmine`)

- Source: [Rogue product page](https://www.roguefitness.com/post-landmine) and the RA0025 instruction PDF.
- Photos (13, 9 distinct): four Rogue studio shots (on bumpers and in an Echo sled) and customer photos on bumpers,
  with a bar, and clevis close-ups. The manual's line drawings show the post dropped through two 45 lb bumpers.
- Published: base post 7.25", 1.875" solid round, pivot sleeve 10", 7 ga steel, 9 lb, 315 lb capacity.
- Built as: the post standing on the floor through two plates from the catalog plate lines (`buildPlateStack`,
  `detail: 'simple'`; default Rogue HG 2.0 45 lb, or Echo V2 45 lb, or 20 kg bumpers), a U clevis with rounded cheeks,
  a 3/4" pivot bolt, and the sleeve at 15°, 30° or 45°.
- Estimated: sleeve 2.375" OD, clevis 3" × 3.25" cheeks, pivot 1.1" from the sleeve's closed end. The white ROGUE print
  on the sleeve is a plain band.

## Rogue Monster Strip (`rogue-monster-strip`) and 3x3 Strip 2.0 (`rogue-3x3-strip-2`) — wall parts

- Sources: [Monster Strip](https://www.roguefitness.com/monster-strip), [3x3 Strip 2.0](https://www.roguefitness.com/the-3x3-strip-2-0), plus the #135 comment.
- Photos: Monster Strip 17 (gallery incl. the annotated spec photo, customer close-ups of the front holes, lettering,
  lags and pins); Strip 2.0 19 (gallery with plate, landmine and chain storage, customer installs).
- Published: 36" or 16" (Half-Strip), 3" × 3" 11 ga tube, side holes 2" on centre, 3/8" × 2-1/2" lags with oversized
  front holes, 8" on centre top and bottom and 16" in the middle (32" span, 2" from each end), 12" on the Half-Strip;
  Monster: 1" × 4-1/2" detent pin, MG Black; 2.0: 5/8" × 4" pin, Signature Texture Black. Monster 13 / 6.75 lb.
- Photo-read layout: side holes on odd inches from the top, front holes on even inches (staggered), with the lag-access
  holes on four of the front stations and a lettering band in the middle (13"–23" on the 36" strip, 5"–11" on the
  Half-Strip). Face width reserves the detent pin (tip out the −X side, pull ring on +X), so toggling the pin never
  moves the strip on the wall.
- Estimated: holes 26.2 mm (Monster) and 17.5 mm (Monster Lite), lag-access holes 1-5/8" / 1-1/4", tube corner radius,
  pin collar and ring sizes, orange Strip 2.0 pull ring (gallery). Lag heads sit inside on the back wall.

## Texas Strength Systems Combo Rack (`tss-combo-rack`)

- Source: [TSS Combo Rack](https://texasstrengthsystems.com/products/tss-combo-rack-copy) (Shopify gallery, 13 images),
  the [used combo rack listing](https://texasstrengthsystems.com/products/used-tss-combo-rack) (2 photos of a real
  installed rack), [squat safeties](https://texasstrengthsystems.com/products/squat-safeties-for-combo-rack) (2) and
  [face savers](https://texasstrengthsystems.com/products/face-savers-for-combo-rack) (1). 18 photos total.
- Published: footprint 39" (rack only) / 64" (with bench) × 83" × 49", hooks lowest ~30" to highest ~69" on 1" holes,
  7 ga uprights, stainless hooks numbered on 3 sides, hand-jack system, drop-in bench with integrated lift-off platform,
  textured non-slip pad, replaceable nylon rollers, bolt-together, 350 lb; 12 frame colours in the variant list with a
  second choice of black / red / white / blue / dark blue.
- Built as: rear crossmember with cut lettering (plain badge pocket), side rails, 4" base sleeves, splayed 3" legs whose
  tips land on the published 83" width, black 3" uprights, stainless 2.5" inner tubes with 3/4" holes on 1" pitch,
  stainless J-hooks with nylon rollers (the bar rests at the hook height), knurled stainless pins, and the hand jack
  (forked post behind each upright, lever arm, link and pin). The drop-in bench: 48" × 12" pad at 17" on an accent
  frame, a floor crossmember between the rails and two diamond-plate lift-off steps flanking the pad head. The pad's
  foot end lands on the 64" footprint, the rack alone measures 39".
- Estimated: every section size except the 7 ga uprights, leg angle (42°), jack linkage geometry, hook plate and cup,
  the pad size and height (competition bench norms), and the rule that the hand-jack stage follows the hook height
  (black upright top 12" below the hook, between 24" and the published 49"). Which part the second colour paints is an
  estimate (the bench frame). Hole numbers are plain etched ticks.

## Theraband FlexBar (`theraband-flexbar`)

- Source: [Performance Health product page](https://www.performancehealth.com/theraband-flexbar) (gallery and A+ images).
- Photos (11): family stack, four in-use shots (red, yellow, blue, green), colour-progression chart, end-on ridge
  close-up, twist and bend shots, and the resistance graphic.
- Published: 12" / 30.5 cm long, dry natural rubber, ridged texture; yellow 1-3/8", red 1-1/2", green 1-3/4", blue 2"
  (6, 10, 15 and 25 lb to bend into a U).
- Estimated: 16 longitudinal ridges (end-on photo) of 4.5 % depth, eased ends. The THERABAND print is a white band.

## Freak Athlete Nordic Mini Pro (`freak-athlete-nordic-mini-pro`)

- Source: [Freak Athlete product page](https://freakathlete.co/products/nordic-mini-pro) (`products/…json`: 4 gallery
  images), 3 more manufacturer images from the page (`Nordic_Mini_3_V3`, `Nordic_Mini_Vertical_Bulletproof_Hamstrings`,
  `Nordic_Mini_Vertical_Storage`) and 11 Loox customer review photos (`loox.io/widget/…/reviews/7648485638383`).
  18 photos in total; #121's agent had 4.
- Published: none in a spec table. The storage photo labels the unit "21″ × 18″" (taken as the pad); the listing ships
  at 49 lb; black textured pad with orange FREAK ATHLETE print on the long side; stores upright on its end plate.
- Built as: the pad on a steel pan and centre spine, splayed flat-bar legs on rubber feet at the knee end, a fixed pair
  and an adjustable (five-hole) pair of 5" foam ankle rollers on a centre post with a pop-pin, and a steel end plate
  with laser-cut lettering, two transport wheels and a chrome counterweight horn. `pose: 1` stands it on the end plate.
- Estimated (scaled from the renders and the storage photo against the 2" horn): everything except the pad, i.e. pad
  thickness and 216 mm height, leg splay, roller size (127 × 216 mm) and gaps (80–180 mm), end plate 14" × 16", wheels,
  horn. A customer-photo scale check suggested the pad could be closer to 24" long; the published 21" is used.

## Coordinates

Floor parts: Z up, origin on the floor; footprints are the exact solid bounds (with `offset` where a part is not
symmetric, e.g. the post landmine's sleeve and the TSS rack's bench). Landmine handles run along local X, the bar axis.
Wall strips: X along the wall, −Y out of it, Z up, origin at the face centre on the wall.
