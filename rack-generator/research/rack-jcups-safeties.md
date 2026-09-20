# Brand J-cups, safeties, spotter arms, pull-up bars and monolifts (#133)

Rack-part registry entries (`rack-parts/rack-jcups-safeties*.ts`, builders in `parts/rack-jcups-safeties*.ts`), in the
"J-cups & safeties" section. Sources checked 2026-09-19. Popularity (gyms owning it) is from Gym Radar, per the issue.
Reference photos (manufacturer galleries, Rogue's Cloudinary gallery, Shopify `products/<handle>.json` images and Gym
Radar owner photos) were downloaded to the agent scratchpad and reviewed as contact sheets beside the renders.

## Registry additions (`rack-part.ts`, `rack-mounts.ts`)

Two small, general additions, both tested in `rack-jcups-safeties.test.ts`; every existing registry test still passes.

| Addition | What | Why |
|---|---|---|
| `mount.span: 'across' \| 'normal'` → context `uprightSpan` | `resolveRack` finds the nearest live post in line with the mounting face (`rackSpan`) and passes the centre-to-centre distance: along local X, signed (`across`) or along +Y (`normal`). Absent when there is no such post. | Pull-up bars sit between the inner side faces (`normal`); strap and flip-down safeties run from a front post to the rear post along the inner face (`across`). One unit draws the whole span; the pair covers the other side. Nothing new is persisted, so saved documents, undo, pairing and the JSON round trip are unchanged. |
| Face-aware `upright` + `uprightWidth` | `rackContextParams` now takes the target face: `upright` is the tube size through that face (so the mating face is always `y = upright / 2`) and `uprightWidth` the face width along X when they differ. | On 2x3 posts (R-3, T-3, S-2) the front face is 1.5 in from the centre but the builder frame put it at `tube / 2` = 1 in, so parts sank 12.7 mm into the post. Square posts are unchanged. |

Swap families: brand J-cups use `j-hooks` (they swap with the built-in hooks), spotter arms `spotter-arm`, monolifts
`monolift`, strap and flip-down safeties `rack:strap-safeties`, pull-up bars `rack:pull-up-bars`.

Fit rules: every product checks its pin/bolt against the bore (1 in = 24.8, 5/8 in = 15.5 mm class) and `validate`s the
face width its clasp or bracket is made for (3 in products accept 73.7–78.7 mm, i.e. true 3 in and the 75 mm BOS
posts; the Titan T-3 hook the 2 in face; the BoS 60 mm version its 60 mm face). `autoFit` picks the 5/8 in variant on
5/8 in racks (REP 4000, Monster Lite, Titan, BOS Hydra) and the T-3 / 60 mm clasp on narrow posts. Note: the Titan
X-3 and T-3 racks use 11/16 in holes and Titan's own hooks use a 16 mm (5/8 in) pop-pin, so the Titan hooks are 5/8 in.
The Rogue Monster Lite line is 3x3 with 5/8 in hardware (the 2x3 Rogue racks are the R-3 / S-2 Infinity-style frames).

## J-cups (`family: 'j-hooks'`, working cradles)

### Ghost Strong Return Roller J-Cup 2.0 (`ghost-strong-ghost-roller-j-cup`, 105)
Sources: [Rogue 1 in](https://www.roguefitness.com/ghost-roller-j-cups-2-0-1-inch-pins) and 5/8 in listings (Rogue
manufactures the 2.0), [Ghost Strong](https://ghoststrong.com/fitness-products/j-cup-2-0/), [Gym Radar](https://gymradar.com/equipment/ghost-roller-j-cup).
Photos (23, Rogue gallery RA2717/RA2719): installed three-quarter views, pin close-ups (texture black / stainless), side
views of the roller in the channel with the Ghost Strong print, lip close-ups, skull-engraved UHMW face, composite and
steel replacement rollers.

| Dimension | Value | Basis |
|---|---|---|
| Width | 69.9 mm (2.75 in) | published |
| Total height / roller to top | 269.9 / 200 mm (10.625 / 7.875 in) | published |
| Back plate | 266.7 mm (10.5 in) | published "7 × 8.25 × 10.5 in" |
| Rackable depth | 73.0 mm (2.875 in) | published |
| Channel | one-piece 3/8 in formed steel (back plate, floor, lip) | published |
| UHMW face / back / lip | 6.35 / 3 / 6.35 mm | estimated |
| Roller | Ø39 mm base, 29 mm waist, 43 mm flare, 70 mm long, axis along +Y 45 mm above the floor | estimated from the replacement-roller photos |
| Clasp side plate | 3/8 in, 64 mm behind the face, 52 mm tall, on −X | estimated |
| Pin | 1 in or 5/8 in, welded, 25.4 mm below the top, 88 mm long | estimated |

Params: pin (5/8 / 1 in), roller (composite / silicon carbide coated steel), finish (texture black with black pin or a
medium gloss colour with a stainless pin). The bar rests in the concave waist near the lip, where the conical roller
returns it.

### REP Fitness Flat Sandwich J-Cups 2.0 and 1.0 (`rep-flat-sandwich-j-cups`, 72 + 29)
Sources: [REP 2.0](https://repfitness.com/products/flat-sandwich-j-cups-2-0) (PRA-4012 / PRA-5013) and the
[Gym Radar 1.0 page](https://gymradar.com/equipment/flat-sandwich-j-cups-1-0) (discontinued).
Photos (17): REP studio pair, four installed close-ups (landing zone, lip, logo plate, U-wrap), Gym Radar owner and
listing photos of the 1.0 (stainless side plates, silver hex bolts).

| Dimension | Value | Basis |
|---|---|---|
| Extension from the rack | 152.4 mm (6 in) | published |
| Landing zone | 6.1 in tall × 1.2 in wide × 2 in long | published |
| Pair weight | 13.3 / 14.3 lb (4000 / 5000) | published |
| Section | 1/4 in steel core + 12 mm textured liners each side (30.4 mm) | estimated to match 1.2 in |
| Height | 198 mm | estimated |
| U-wrap | 5 mm, 57 mm tall, 64 mm back along both side faces | estimated |
| 1.0 lip | 12 mm lower than the 2.0 ("taller landing zone" on the 2.0) | estimated |

Params: series (4000 · 5/8 in, 5000 · 1 in) and version (2.0 metallic black logo plates with a stainless logo window;
1.0 brushed stainless plates with a black window and silver bolts). The REP logo is a plain window plate.

### Rogue Monster Lite J-Cups (`rogue-monster-lite-j-cups`, 34 + 35) and Monster 1" Sandwich J-Cups (`rogue-monster-sandwich-j-cup`, 35)
Sources: [Monster Lite J-Cup Pairs](https://www.roguefitness.com/j-3358-monster-lite-j-cups), [Monster J-Cup Pairs](https://www.roguefitness.com/monster-j-cup-pairs).
Photos (16 ML + 4 Monster; the ML and Monster sandwich cups share one design): comparison strip of standard / 1 in /
2 in sandwich, standard installed side and front, standard UHMW insert and floor pad close-ups, sandwich profile
close-ups, top views of the core, clasp close-ups.

| | ML standard | ML 1 in sandwich | Monster standard | Monster 1 in sandwich |
|---|---|---|---|---|
| Width | 3 in | 1.5 in | 3 in | 1.5 in |
| Height | 6 in | 10 in | 7.75 in | 10 in |
| Rackable depth | 2.5 in | 2.5 in | 2.75 in | 2.5 in |
| Plate | 3/8 in | 3/8 in | 3/8 in | 3/8 in |
| Pin | 5/8 in | 5/8 in | 1 in | 1 in |

All published. Estimated: the bent outline (9 mm bend, 40° lip), UHMW face insert (64 mm wide, 4 screws) and floor pad,
the 3/4 in UHMW core proud of the plates by 2.5 mm and running to the top, the clasp (3/8 in, 60 mm back along the +X
side face at the arm height), and the UHMW back pad on the Monster cups.

### Bells of Steel Roller J-Cups (`bells-of-steel-roller-j-cups`, 38)
Source: [Bells of Steel](https://bellsofsteel.com/products/roller-j-cups) (R-CUP-RA-HDR, RC-RA-MTC, RLR-CUP-RA).
Photos (11): Hydra pair (white rollers, BOS engraved UHMW), 60 mm pair, installed on a Hydra, Manticore pair with the
knurled mag-pin knob, bench-press use, face-on views. Published: fits (Hydra 3x3 5/8 in, Manticore 3x3 1 in with mag
pins, 60 mm 5/8 in), capacities. All dimensions estimated: back plate 64 × 190 mm, 88 mm channel, Ø44 mm nylon roller
along +Y, 80 mm lip plate with a UHMW pad, one clasp side plate on +X, mag pin through the clasp three stations down.

### Irwin Fitness Return Roller J-Cups 2.0 (`irwin-return-roller-j-cups`, 32)
Source: [Irwin Fitness](https://irwinfitness.ca/products/ifs-roller-j-cups). Photos (16): nine colour renders on an
upright, front and side renders of the four roller types, an owner photo of red cups. Published: machined acetal or
2 in hardened steel rollers (center return or flat), solid-steel formed clasp (±1 mm on 3 in tubing), secondary 5/8 or
1 in pin hole, custom powder coat. Estimated: 250 mm UHMW-faced back plate, collar wrapping both sides and the back
(75 mm tall), triangular gusset under a 76 mm channel, 6 mm center-return dip.

### Titan X-3 / T-3 Quick Release Roller J-Hooks (`titan-x3-roller-j-hooks`, 27)
Sources: [X-3](https://www.titan.fitness/products/x-3-series-quick-release-roller-j-hooks) (401952),
[T-3](https://www.titan.fitness/products/t-3-series-quick-release-roller-j-hooks) (401951). Photos (18): studio pair,
installed on a red X-3, lip / roller close-ups, pop-pin knob close-up, two dimension graphics. Published: 9.5 in tall,
10 in deep, 1.5 × 3 in roller pad, 5/8 in (16 mm) locking pop-pin, 1,000 lb pair, 11 lb pair. Estimated: 6 mm plates,
back band behind the upright carrying the pop-pin three stations below the top pin, gusset. The model is 231 mm deep
against the published 10 in (the dimension line includes the knob's full width).

## Spotter arms (`family: 'spotter-arm'`, working cradles on the arm tops)

| Product | Published | Estimated |
|---|---|---|
| Rogue SAML-24 Monster Lite (`rogue-saml-24-spotter-arms`, 90) — [Rogue](https://www.roguefitness.com/saml-24-monster-lite-spotter-arms-pair) | 3x3 in 11 ga, 24.625 in, UHMW top insert, welded end plates, 5/8 in pins and hitch pins, 44 lb pair | 276 mm end plate, U clasp at arm height, 300 mm gusset with the logo cut-out, top pin 30 mm above the arm, hitch pin four stations down, ten 1/2 in holes |
| Rogue Monster Safety Spotter Arms 2.0 (`rogue-monster-spotter-arms-2`, 40) — [Rogue](https://www.roguefitness.com/monster-safety-spotter-arms-2-0) | 24 in from the upright, 19 in flat, 3x3 11 ga, 0.375 in clasp, 0.1875 in extended gusset, Face Saver angled UHMW, 2 in hole centres, two 1 in detent pins, 54 lb pair | clasp 210 mm tall and 70 mm back, top triangle, gusset window for the detent pin three stations down |
| REP Spotter Arms (`rep-spotter-arms`, 74) — [REP](https://repfitness.com/products/spotter-arms) | 27.6 in long, 23.4 in landing, 11.3 in tall, 3 mm main / 2 mm support tube, 5 mm gusset, 1 in holes, steel lip, polyurethane pads | 2 × 3 in arm with the pin at mid-height, upper U clasp and padded lower wrap, strut from the plate foot to 330 mm out, white REP logo plate |
| Surplus Strength Stealth Spotters (`surplus-strength-stealth-spotters`, 32) — [Surplus Strength](https://surplusstrength.com/products/stealth-spotters) | 27 3/16 in total, 20 in+ flat catch, 13 3/4 in usable below, 7 in tall (three holes), 1 in welded stainless pin, UHMW, 3x3 / 1 in / 2 in | 1/4 in side plates rising to the 7 in channel, 3/8 in UHMW, rear locking slot, logo cut-out on the lip |
| Oak Club Mfg Alpha (`oak-club-alpha-spotter-arms`, 30) — [Oak Club](https://oakclubmfg.com/collections/rackattachments/products/alpha) | 3/16 and 1/4 in welded steel, low-profile double-sided, 3/8 in UHMW both sides, MagPin sold separately | 610 mm × 63.5 × 76 mm arm flaring to ±75 mm at a wrap-around collar, club and ring cut-outs, MagPin across through the side holes (`pinAxis: 'across'`), accent colours |

Photos: SAML 6 + Gym Radar, Monster 2.0 7 + Gym Radar, REP 21 (1.0 studio and PR-4000 installs, plus 2.0 lifestyle for
context), Stealth 11 (installs, handling shots, renders, spec card), Alpha 8 (installs, collar close-up, colourway).

## Strap and flip-down safeties (`span: 'across'`, inner side faces, pairs)

| Product | Published | Estimated |
|---|---|---|
| REP Strap Safeties 2.0 / 1.0 (`rep-strap-safeties`, 30 / 48) — [2.0](https://repfitness.com/products/strap-safeties-2-0), [1.0](https://repfitness.com/products/strap-safeties) | 3 in reinforced nylon, 0-gauge brackets (2.0), 26.8 / 37.6 in usable (30 / 41 in), 24 / 30 / 41 in depths, 1,000 lb pair | 2.0 wrap bracket with the strap bolt on ears past the post edge, 18 mm sag; 1.0 flat twin-pin bracket, 45 mm sag |
| Rogue Monster Safety Strap System 2.0 (`rogue-monster-strap-safety-2`, 43) — [Rogue](https://www.roguefitness.com/rogue-monster-safety-strap-2-0-systems) | 3 in nylon rated 10,000 lb, 0.3125 in brackets, 1 in pins, 3 UHMW pieces, 24 / 30 / 43 in | hanger outline, grey wear sleeve over the middle 60 %, 25 mm sag |
| Rogue Monster Lite Strap Safety System 2.0 (`rogue-monster-lite-strap-safety-2`, 41) — [Rogue](https://www.roguefitness.com/monster-lite-strap-safety-system-2-0) | 3 in black nylon, 0.3125 in formed brackets, 0.625 in pins, J-cup style pin-and-swing hangers | as above without the sleeve |
| Bells of Steel Safety Straps (`bells-of-steel-safety-straps`, 29) — [BoS](https://bellsofsteel.com/products/safety-straps) | black, blue, purple and orange; 17 / 24 / 30 / 43 in; Hydra and Manticore | 50 mm strap, grey brackets |
| REP Flip-Down Safeties (`rep-flip-down-safeties`, 39) — [REP](https://repfitness.com/products/flip-down-safeties) | 11-gauge steel, plastic top liner, clevis quick-release pin, 1 in side holes, 24 / 30 / 41 in, 1,000 lb | 2 × 3 in tube on its 2 in side against the inner faces, welded pivot tab at the target hole, clevis lock at the far post one station lower; also a working cradle for rack pulls |

The strap follows the actual post spacing, so the product lengths are notes rather than params: a rack built with the
wrong depth for a real strap is not refused. Photos: REP 14 (1.0 and 2.0 studio, installs, bracket close-ups), Rogue
Monster 5 and Monster Lite 4 plus Gym Radar, BoS 16 (hero, every colour and length), flip-downs 27 (1.0 and 2.0).

## Pull-up bars (`span: 'normal'`, between the inner side faces, single units)

| Product | Published | Estimated |
|---|---|---|
| REP 1.25" Pull-Up Bar (`rep-pull-up-bar`, 36) — [REP](https://repfitness.com/products/1-25-pull-up-bar) | 40.8 in usable, 1.25 in bar, 4 in mounting-hole distance, 4.5 mm steel, 16.5 lb | 57 × 165 mm end plates, bar midway between the two bolts (holes [0, −2]) |
| REP Multi-Grip Pull-Up Bar (`rep-multi-grip-pull-up-bar`, 46) — [REP](https://repfitness.com/products/multi-grip-pull-up-bar) | 41.4 × 14.6 × 7.3 in, 14 ga, 1.25 in front bar and grips, 2 in rear bar, neutral-wide 28.4, neutral 6.1, close-to-wide 11.1, bars 12.3, straights 28.4 in | arched side rails, end plates with two bolts, a `grips` param for which way the frame reaches (local −X points into the rack from the front posts) |
| Rogue 43" Fat/Skinny Bar X-433 (`rogue-fat-skinny-pull-up-bar`, 26) — [Rogue Monster Lite crossmembers](https://www.roguefitness.com/monster-lite-crossmembers) | 43 in, 1.25 in OD over 2 in OD, 14 in flanges (dimension graphic) | 2 in × 3/8 in flanges, bolts at the top and three stations down, bar heights on the flange |

## Monolifts (`family: 'monolift'`, working cradles)

| Product | Published | Estimated |
|---|---|---|
| Rogue AM-2 / AML-2 Adjustable Monolift 2.0 (`rogue-am-2-monolift`, 30) — [AM-2](https://www.roguefitness.com/rogue-am-2-adjustable-monolift-2-0-monster), [AML-2](https://www.roguefitness.com/rogue-aml-2-adjustable-monolift-2-0-monster-lite) | 16.75 in from the face, 3.25 in jaw, 4 in / 1.25 in widths, 14 in (AM-2) / 17 in (AML-2), 18 in loaded, 0.25 and 0.375 in steel, 8 in re-rack space, MG black / texture red / texture black | frame plates with the window and logo cut-out, handle, J jaw with recessed UHMW, hook and backstop bolts, detent pin with D-ring; shown unloaded |
| Mutant Metals Snap-Back Rollers V1.1 (`mutant-metals-snap-back-monolift`, 26) — [Mutant Metals](https://mutantmetals.com/products/p/mutant-metals-snap-roller-monos) | < 23.5 lb per side, torsion springs, 0–5.5 in clearance, 2-1/4 in roller space, 2-3/16 in max bar, 3/8 in steel, dual ball-bearing pivot, fits 3x3 / 2x3 with 5/8–1 in holes | quarter-arc side plates 300 × 290 mm, swing arm from the outer pivot to the roller catch 140 mm out, body and arm colours; shown in the catch position |

Photos: AM-2 16 (installs, jaw, bracket, detent pin, handle close-ups), Mutant Metals 13 (owner photos in several
colourways, studio shots of the body and arm).

## Skipped

- **Rogue Monster Mini Feet** (29): they bolt to the lowest upright holes and must reach the floor, but rack parts do
  not know the target hole's height above the floor; adding that context (and a floor-contact rule) is left for a
  follow-up. Researched: 13 in from the mounting face, 3 in wide, 6.75 in to the top of the foot tube, 3x3 11 ga, 1 in
  holes, (4) 1 in Monster bolt assemblies per pair.
- **REP PR-5000 crossmembers/uprights** (38/28): covered by the PR-5000 rack profile.
- **REP Spotter Arms 2.0** and the 2 in Monster Lite / Monster sandwich cups: not in the issue list.
