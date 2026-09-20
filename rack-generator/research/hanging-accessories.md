# Bands, rings, suspension trainers, collars & pegboard accessories (issue #127)

Sources checked 2026-09-19. Popularity is from Gym Radar (Sep 2026; item pages under `gymradar.com/equipment/…`). Every entry hangs
from one pegboard hook with the shared hang contract: origin on the hook rod axis (Ø6 rod, so whatever rests on it touches z = +3),
X along the wall, −Y out of it, Z up; `hook: 1` adds the J-peg. The peg runs from the panel face (y = +75) to its upturned tip
(y ≈ −22, rising to z = +23), so anything threaded on the peg lives in y ∈ [−19.4, 75]. Envelopes are the build bounds rounded up
(the family test checks containment and tightness).

**How things hang.** Loops hang the physical way: the rod passes through them, so a loop's width runs along the peg (Y) and the
loop is seen edge-on from straight in front (bands, collars, rings, the belt, the Sling Shot and Hip Circle). A loop is a *drape*:
a top arc wrapped on the rod, a bottom arc, and the two tangent strands, solved so the centreline has the product's real perimeter
(`drape()` in the builder). Loops wider than the free peg (4″ band, 4″ belt, 6.5″ Sling Shot) sit flush with the panel and their
front edge is gathered back to the tip over the top 6–70 mm (`clipFront`), the way a wide band or sleeve bunches on a short peg.
Webbing that hangs below a loop (wrist wraps, Ohio straps, TRX, ring straps, the pillow belt pad) is modelled flat-laid facing
out, as in the cable-handles family; real webbing twists.

**Params.** Hang parts carry no product params (the hang registry persists only `{panel, slot}`), so real variants become separate
entries (the eight Monster Band strengths) or are fixed to the default/most-photographed colourway and size noted below.

Photos were downloaded to the agent scratchpad (Shopify `products/<handle>.json` galleries, Rogue `assets.roguefitness.com`
catalog images, IronMind store images, Okendo review photos), viewed as contact sheets, and compared with renders from
`scripts/shoot-part.ts` (iso, front and side) over two review rounds.

## Fat Gripz Pro, blue (220) — `fat-gripz` · Fat Gripz Extreme (55) — `fat-gripz-extreme`

- Source: [fatgripz.com Fat Gripz Pro](https://www.fatgripz.com/products/fat-gripz-original-1) (7 images incl. the size chart),
  [Fat Gripz Extreme](https://www.fatgripz.com/products/fat-gripz-extreme) (6 images), Gym Radar "Fat Gripz – Blue" (220) and
  "Fat Gripz Extreme" (55). 12 distinct photos across both.
- Published (size chart): outside Ø 1.75″ (One), **2.25″ (Pro, blue & black)**, **2.75″ (Extreme, orange)**; all sizes inside Ø
  1.1″ (2.7 cm) and **4.75″ (12 cm)** long; sold as a pair.
- Built: Ø57.15 / Ø69.85 × 120.65 mm sleeves, Ø27.94 bore, one shown (the pair doesn't fit on one 97 mm peg).
- Pose: slid onto the peg, the bore's top resting on the peg tip at the front and on the rod near the panel, so the grip tilts
  ≈ 12° toward the wall (`gripzPose` solves the tilt so the back stays inside the panel face).
- Estimated: squeeze-on slit (4.4 mm), smooth label panel and wordmark as flat plates; the diamond texture is not modelled
  (matte material instead). Colours: Pro blue `#1b8fd8`, Extreme orange `#f26a1b` with blue-grey text.

## Rogue Monster Bands (180) — `rogue-monster-band-0` … `-7`

- Source: [roguefitness.com/rogue-monster-bands](https://www.roguefitness.com/rogue-monster-bands) (16 images: family hero, five
  lifestyle, per-colour close-ups of #0, #2, #3, #5, #6, #7, pull-up packages), Gym Radar "Monster Bands" (180).
- Published (resistance breakdown): every band 41″ long, natural latex.

  | # | Name | Colour | Width × thickness | Resistance |
  |---|---|---|---|---|
  | 0 | Micro | orange | 0.25″ × 0.18″ | 9 lb |
  | 1 | Mini | red | 0.5″ × 0.18″ | 18 lb |
  | 2 | Mini | blue | 0.5″ × 0.25″ | 30 lb |
  | 3 | Light | green | 1.13″ × 0.18″ | 40 lb |
  | 4 | Average | black | 1.75″ × 0.18″ | 65 lb |
  | 5 | Strong | purple | 2.5″ × 0.18″ | 95 lb |
  | 6 | Strong | red | 3.25″ × 0.18″ | 115 lb |
  | 7 | Super | silver | 4″ × 0.25″ | 225 lb |

- Built: loop inner perimeter 82″ (a 41″ flat loop), top bend on the rod, bottom bend inner radius 11 + 4.5 × width″ mm; hanging
  length 1030–1037 mm (≈ 41″ incl. both bends); width along the peg exactly as published.
- Print: 1.75″+ bands carry the big ROGUE (five letter blocks along the strand), the minis the small Rogue Fitness wordmark
  (one strip); #7 has the three black stripes above the print. Colours sampled from the per-band photos.
- Estimated: bottom-bend radius (latex stiffness), print length and position.

## Fringe Sport Magpin (157) — `fringe-sport-magpin`

- Source: [fringesport.com Magpins](https://www.fringesport.com/products/magpin-magnetic-hitch-gym-pin-for-squat-racks)
  (9 images) + [Strong AF Magpin](https://www.fringesport.com/products/strong-af-magpins) (8 images, same cap and pin), Gym Radar
  "Fringe Sport Mag Pin" (157). 17 photos.
- Published: 1″ pin = 24.5 mm diameter, **5.5″ pin length**, stainless; **2″ cap diameter, ¾″ cap thickness**, knurled anodised
  aluminium magnetic cap; drilled nose with included lock pin; also 5/8″ (15.5 mm). Colours black, red, blue, green, pink, gold.
- Built: 1″ black (first variant). Hung by the lynch pin: the pin through the nose hole and its hoop form a D whose arc rests on
  the rod, the Magpin hanging straight down (cap at the bottom with the white Fringe Sport print).
- Estimated: lynch pin (Ø4.8 pin, 34 mm hoop, brass-coloured), nose-hole position (9 mm from the tip).

## IronMind Captains of Crush No. 1 (144) — `ironmind-captains-of-crush-no-1`

- Source: [ironmind.com CoC grippers](https://www.ironmind.com/product-info/ironmind-grippers/captains-of-crush-grippers/),
  [ironmind-store.com No. 1](https://www.ironmind-store.com/No1-Captains-of-Crush-Hand-Gripper/productinfo/1251/),
  [Rogue CoC listing](https://www.roguefitness.com/captains-of-crush-grippers) (2 photos) and IronMind gallery images (retail
  card, caddy, logo, gripper with strength-stamped end, IMTUG family); 12 images. Gym Radar (144).
- Published: knurled aircraft-grade aluminium handles, GR8 springs, strengths Guide 60 lb … No. 4 365 lb; **No. 1 c. 140 lb**
  ("already gripping, start here"). IronMind publishes no dimensions.
- Built (all estimated from photos, scaled from a hand): handles Ø25.4 × 99 mm with a polished band 13 mm below the top, 6.2 mm wire,
  2.5-turn coil Ø34 outside, handles splayed 15° each side; 153 mm overall. Hung by the coil over the peg (coil axis along Y).

## KeppiFitness OPENCOLLAR (137) — `keppi-opencollar`

- Source: [keppifitness.com barbell clips](https://keppifitness.com/products/keppifitness-barbell-clips) (11 images: silver, pink,
  black and red colourways, lock mechanism, cover, magnet, bar-head fit), Gym Radar (138 as of Sep 2026).
- Published: 2″ C-shaped clamp, double-lever one-way deadlock, aluminium alloy cover, rubber body, built-in magnet; variants
  Silver/Black (default), Black/Red, Black.
- Built: pair on one hook, C opening downward; Ø96 × 44 mm each (estimated against the 2″ bore), 50 mm opening, steel jaw tabs at
  the opening, brushed cover over the top-left rim, stainless flip lever with its loop on top.

## Rogue USA Aluminum Collars (118) — `rogue-usa-aluminum-collars`

- Source: [roguefitness.com/rogue-usa-aluminum-collars](https://www.roguefitness.com/rogue-usa-aluminum-collars) (5 images) and
  the [Cerakote version](https://www.roguefitness.com/rogue-cerakote-usa-aluminum-collars) with the same billet body (5 images: black,
  colour line-up, on-bar, logo and bore close-ups). 10 photos.
- Published: **1.5″ width**, 0.25 lb each, 6061 billet, clear hard anodised, laser-etched logo, rubberised lining, black nylon
  lock-open lever with snap flexure and white Rogue logo, (4) rolling dowel pins.
- Built: pair, Ø76 twelve-flat body (estimated), 1.5 mm lining, hinge knuckles at the upper left, black lever tangent at 55°.

## TRX HOME2 (101) — `trx-home2-suspension-trainer`

- Source: [trxtraining.com HOME2 System](https://www.trxtraining.com/products/home-gym) (7 images incl. the labelled diagram) and
  [PRO4 System](https://www.trxtraining.com/products/pro) (8 images, same strap architecture). Gym Radar "TRX Suspension Trainers"
  (101) covers the line-up; HOME2 is TRX's best seller.
- Published (diagram): carabiner for anchor, adjustable straps, premium webbing, foam handles, adjustable foot cradles, door and
  suspension anchors, mesh bag. TRX publishes no strap dimensions.
- Built: black carabiner on the rod → black stem with a yellow TRX tab → two black straps with grey centre stripes and cam
  buckles → yellow lower straps (triangle) → Ø32 × 5″ foam handles → foot cradles; 317 × 950 mm, straps shortened.
- Estimated: shortened length (≈ 36″), 1.5″ webbing, handle size, buckle and cradle sizes.

## Titan TwistLock Pro, black (97) — `titan-twistlock-pro-collars`

- Source: [titan.fitness TwistLock Pro](https://www.titan.fitness/products/twistlock-pro-barbell-collars) (32 images across four
  colours; 11 used: black set of 8 incl. the dimension drawing, OD green, space grey, inferno red).
- Published (drawing): **3.675″ OD, 1.5″ width, 49.5–51.5 mm bore**, 1.42 lb per pair, medium volcano knurling, magnets.
- Built: pair; knurled rim band between polished face edges, black twist-lock insert (Ø62 → bore), TITAN wordmark and helmet on
  the face.

## Rogue HG 2.0 Collars (81) — `rogue-hg-2-collars`

- Source: [roguefitness.com/rogue-hg-2-0-collars](https://www.roguefitness.com/rogue-hg-2-0-collars) (5 images) and the
  [magnetic HG 2.0](https://www.roguefitness.com/rogue-hg-2-0-collars-magnetic) with the same body (5 images). 10 photos.
- Published: **1.875″ width**, 0.85 lb per pair, solid nylon resin, red tab with spring, stainless hardware, rubber pads,
  embossed logos.
- Built: pair, chamfered-square body 86 mm across (estimated), ribbed pad in the lower bore, red tab on top, ROGUE HG badge on the
  side flat. The pair (2 × 1.875″ = 95.25 mm) is 1 mm longer than the free peg, so the front collar sits 1 mm ahead of the tip's
  back face.

## elitefts Pro Resistance Band Pack (80) — `elitefts-pro-resistance-band-pack`

- Source: [elitefts.com pack](https://www.elitefts.com/products/eliteftstm-pro-resistance-band-pack) (3 images) and the single
  Pro Mini/Light/Average/Strong pages (9 more: band close-ups, collages, calibration chart). 12 photos.
- Published: 4 matched pairs — Pro Mini **0.5″** red, Pro Light **1.25″** orange, Pro Average **1.75″** grey, Pro Strong
  **2.5″** blue (pack listing; the single Strong page says 1.75″, the pack photo shows the blue band clearly widest, so 2.5″ is
  used); 41″ long; Pro Mini 4.5 mm thick (used for all).
- Built: eight loops nested on the rod, widest innermost, all front edges against the peg tip; nested loops share the arc
  spacing, so each outer band is drawn one thickness longer (≈ +1.4% per band, within latex stretch). White elitefts prints on
  the visible part of each pair's outer band.

## Bells of Steel Magnetic Clamp Collars, black (73) — `bells-of-steel-magnetic-clamp-collars`

- Source: [bellsofsteel.com Magnetic Clamp Collars](https://bellsofsteel.com/products/magnetic-clamp-collars) (8 renders across
  black/blue/orange) + 6 Okendo customer photos (on a bar, on a rack, next to a tape measure).
- Published: **1″ (25 mm) width, 3″ (76.2 mm) outer diameter**, 2″/50 mm bore, magnets, rubberised interior.
- Built: pair, rounded octagon, lever folded along the right flat with the white BELLS OF STEEL print, four face magnets.

## Mark Bell Sling Shot Original (72) — `mark-bell-sling-shot-original`

- Source: [markbellslingshot.com Original](https://markbellslingshot.com/products/original-sling-shot) (2 images) plus the Reactive,
  Full Boar and Money Shot pages (same construction, 10 images: flat lay, seam close-up, worn front, bench lifestyle). 12 photos.
- Published: level 3 stiffness, red, sizes M–3XL by bodyweight. No dimensions.
- Built (estimated): size L, 6.5″ sleeves, 7.5″ flat sleeve length, 5″ sewn centre panel, 3.2 mm knit; hung by one sleeve with the
  second sleeve hanging free; white seams and outline badge (logo artwork not copied).

## Spud Inc. Pillow Belt Squat Belt (67) — `spud-pillow-belt-squat-belt`

- Source: [spud-inc-straps.com Pillow Belt](https://www.spud-inc-straps.com/products/the-pillow-belt-squat-belt) (6 images) and the
  [Adjustable Pillow Belt](https://www.spud-inc-straps.com/products/adjustable-pillow-belt-squat) (5 images). 11 photos.
- Published: large pad **36″ × 6.5″**, adjustable version lists **36″ × 6.5″ × 1.5″**, 7 adjustment loops 2″ apart.
- Built: large, hung by both loop straps with the pad folded in half (fold at the bottom), charcoal webbing stripe down the front
  and the yellow-on-black Spud Inc label at the fold; 165 × 716 mm.

## REP Competition Wood Rings (63) — `rep-wood-gymnastic-rings`

- Source: [repfitness.com straps + rings](https://repfitness.com/products/competition-gymnastic-straps-and-wood-rings) (16 images)
  and [wood rings](https://repfitness.com/products/wood-gym-rings) (2 images). Gym Radar "Wood Gymnastic Rings" (63).
- Published: 1.11″ or **1.25″** grip, 7′ or 14′ straps, 7′ strap has 29 numbered 2.5″ sections (usable 49″–7′), double-layer
  webbing, screw-lock carabiner.
- Built: 1.25″ rings (Ø180 inner, estimated to the FIG standard), both on the rod; each strap cinched round its ring bottom and
  folded into a four-layer hank with white numbers and the black carabiner at the fold.

## Oak Club MagPin 3 (61) — `oak-club-magpin-3`

- Source: [oakclubmfg.com MagPin 3](https://oakclubmfg.com/products/magpin-3) (7 images) + 100 BLK and Jazz Teal pages (6 images).
- Published: 4-1/2″ usable shaft, two-tone aluminium head, concealed magnet, stainless shaft, sold in pairs.
- Built: pair clinging by their magnet faces to either side of the hook rod just above the shaft (the magnet face is the shaft
  side of the head), shafts running under the rod; Ø44.5 × 19 mm knurled black heads with gunmetal collar rings, 1″ shafts.
- Estimated: head diameter and thickness, shaft diameter (1″ option).

## Mark Bell Hip Circle (48) — `mark-bell-hip-circle`

- Source: [markbellslingshot.com Hip Circle](https://markbellslingshot.com/products/hip-circle) (11 images: blue, black,
  grey-black, lifestyle). 10 used.
- Published: moderate resistance, black/blue/grey-black, M/L/XL by bodyweight. No dimensions.
- Built (estimated): black L, 3.25″ wide, 15.5″ flat, 4 mm woven fabric with grey grip strips inside and a white outline badge.

## Inzer Forever Lever Belt 10 mm — `inzer-forever-lever-belt-10mm`

- Chosen because it is the classic 10 mm lever belt with the most complete source (31 images); Gym Radar does not track belts.
- Source: [inzernet.com Forever Lever 10MM](https://www.inzernet.com/products/forever-lever-lifting-belt™-10mm) (10 used: black,
  black smooth, charcoal, red, tan, navy, black/red, the L13 black and the Choice Lever black for buckle angles).
- Published: 10 mm one-piece leather, four rows of lock-stitched nylon, suede, lever buckle, sizes XS–5XL (L 34–38″).
- Built: black suede L, 4″ competition width (not stated on the page), closed ring of 35″ centreline circumference hung over the
  rod, overlapping tongue flap and polished lever buckle on the right side, prong holes beside it, stitch rows 8/14 mm from each edge.

## Rogue Wrist Wraps 2.0 — `rogue-wrist-wraps-2`

- Source: [roguefitness.com/rogue-wrist-wraps-2-0](https://www.roguefitness.com/rogue-wrist-wraps-2-0) (6 images) and
  [Rogue Wrist Wraps](https://www.roguefitness.com/rogue-wrist-wraps) (6 images, same thumb loop and tab). 12 photos.
- Published: **17″ / 24″ / 37.5″** lengths, **3″ width**, ⅝″ elastic thumb loop, reinforced hook-and-loop tab, reflective
  Rogue embossment, black.
- Built: 24″ pair hung by the thumb loops, wraps flat-laid facing out and fanned ±2°, logo, hook-and-loop field and pointed tab.

## Rogue Ohio Lifting Straps – Nylon — `rogue-ohio-lifting-straps`

- Source: [roguefitness.com nylon Ohio straps](https://www.roguefitness.com/rogue-ohio-lifting-straps-nylon) (4 images) and the
  [cotton Ohio straps](https://www.roguefitness.com/rogue-ohio-lifting-straps) (4 more, same cut). 8 photos.
- Published: **22.5″ × 1.5″**, closed single loop, black nylon, red and white Rogue label.
- Built: pair hung by their loops (9″ loop perimeter, estimated), tails flat-laid facing out with the red label and box stitching.

## Rogue SR-1 Bearing Speed Rope — `rogue-sr-1-speed-rope`

- The issue's "Rogue Pro" jump rope has no exact Rogue product; the SR-1 is Rogue's staple bearing speed rope.
- Source: [roguefitness.com SR-1](https://www.roguefitness.com/rogue-sr-1-regular-handle-bearing-speed-rope-color-series) (7 images)
  and [SR-1S](https://www.roguefitness.com/sr-1s-short-handle-bearing-speed-rope-color-series) (6 images). 13 photos.
- Published: **6.75″ handle, 0.5″–0.875″ taper, 120″ coated 3/32″ cable**, 4 cartridge bearings.
- Built: red handles with grey cable (the hero colourway), cable in three Ø216 coils over the rod, both handles hanging below with
  black bearing caps.

## Skipped

- **Theraband FlexBar (24)**: sourced (12″ long; yellow 1-3/8″, red 1-1/2″, green 1-3/4″, blue 2″ —
  [performancehealth.com](https://www.performancehealth.com/theraband-flexbar)), but it is a plain ridged rubber bar with no hole,
  loop or strap, so it cannot hang from a single peg (it can only lie across one, which fails the anchor contract). Left for a
  shelf/floor accessory.
