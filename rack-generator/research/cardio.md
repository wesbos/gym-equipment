# Bikes, treadmills & other cardio machines (issue #116)

Sources checked 2026-09-19. 18 catalog entries (`floor-parts/cardio.ts`), built by four builder files:
`parts/cardio-bikes.ts` (Peloton Bike / Bike+, Schwinn IC4, Sunny SF-B1002), `parts/cardio-treadmills.ts` (one parametric
motorised-treadmill builder for eight `TreadmillSpec`s), `parts/cardio-machines.ts` (AssaultRunner Pro / Elite, BowFlex Max
Trainer M6, WaterRower, StairMaster 8Gx, Sole E35) and the shared `parts/cardio-kit.ts` (extends `ergs-kit.ts` with typeset
wordmarks, glossy displays and side-profile coordinates).

Frame: every machine has its FRONT (console / handlebar end) at −Y and the user facing it; side-profile numbers are `s` mm
back from the front extreme and `h` mm up. The published length × width is the in-use footprint and is hit exactly by
construction (a named extreme element sits on each face; `cardio.test.ts` checks every variant to 1 mm). Brand names are
typeset in the bundled Helvetiker Bold, never copied logo artwork. Displays are dark glossy glass slabs in a bezel sized
from the published diagonal; belts are dark matte (`liner`).

Method: for each product the published dimensions set the envelope; the geometry inside it comes from side profiles
measured on the manufacturer photos with a pixel grid (scale = published length ÷ pixel length, floor line as datum), and
details (colours, badges, knobs, grilles) from the rest of the gallery. Photo counts below are the images downloaded and
reviewed for that product.

Use areas (`clearance`): Peloton publishes 24 in on all sides for the bikes. For treadmills the iFIT (NordicTrack / ProForm)
manuals ask for 8 ft behind and 2 ft each side, Sole / Horizon / Peloton / Assault 6.5 ft (2 m) behind and 2 ft each side;
the model uses 2 ft sides and 2 m (iFIT: 2.44 m) behind, none in front, offset toward the rear. Folded, the use area is the
footprint. Bikes / climbers / trainer / elliptical: 2 ft around (StairMaster: 2 m behind the step-on end). These are the
manufacturers' general manual guidance; individual manuals were not all re-read (estimate noted).

## Peloton Bike — `peloton-bike`
- https://www.onepeloton.com/bikes/compare (original series): 59" L × 23" W × 53" H, 135 lb, 21.5" HD touchscreen,
  −1 to 44° tilt, 170 mm forged cranks, Delta pedals, 4' × 2' footprint. Cross Training series (2025): 54 × 23 × 61 in —
  not modelled (see below).
- 53 in is the handlebar height, not the screen: on the side profile (onepeloton refurbished/original renders) handlebar
  top ≈ 1335 mm and screen top ≈ 1570 mm, scale 3.61 mm/px from the 59 in length. Test: handlebar 53 in ±15 mm.
- Measured (u from the rear dumbbell cradle): saddle 145–462, top 1245; crank centre 585 / 440 h; flywheel centre 1148 /
  415 h, Ø 510 in its cover; head junction 1100 / 985 h; front foot ≈1390; screen top edge = front extreme.
- Details: matte black frame, PELOTON on both sides of the down tube, fork straddling the flywheel, silver belt guard with
  its window, red five-spoke drive pulley, red resistance knob on the down-tube top, two bottle holders, rear dumbbell cradle,
  front transport wheels, four levellers.
- Estimates: tube sections, the curve of the down tube (straight here), handlebar horn shape, screen-post curve (±30 mm).
- Photos (27): refurbished-original side/¾ renders, CT side profile, screen swivel, saddle close-up, handlebar tray,
  lifestyle shots, dimensions.com drawing.

## Peloton Bike+ — `peloton-bike-plus`
- Same page: 59" L × 22" W × 59" H, 140 lb, 23.8" rotating screen, 170 mm cranks. Same frame as the Bike in graphite with
  a dark drive pulley; the screen rides on the swivel arm ahead of the bars, its top at 59 in and its back face the front
  extreme. 22 in wide means a slim 552 mm bezel around the 527 × 297 mm glass.
- Photos (12): Bike+ original gallery (onepeloton refurbished), CT Bike+ profile, screen/arm close-ups.

## Schwinn IC4 — `schwinn-ic4`
- https://www.schwinnfitness.com/products/schwinn-ic4-indoor-cycling-bike; specs 48.7" L × 21.2" W × 51.8" H, 106 lb,
  40 lb flywheel, 100 magnetic levels, 3 lb dumbbells, backlit LCD + media rack (Scheels / Johnson Fitness listings).
- Side profile from the identical BowFlex C6 side view (bowflex.com/products/c6-bike): 3.586 mm/px; flywheel centre
  s 287 / h 373 Ø 430 (guard), head top s 323 / h 1005, crank s 757 / h 362, saddle s 914–1165 top 1119, media shelf top =
  51.8 in.
- Details: charcoal frame, twin fork plates, black flywheel guard with red ring and hub on both faces, grey drive cover,
  red saddle, red pop-pin / resistance knobs, red dumbbells in cradles on the front upright, SCHWINN / IC4 lettering.
- Photos (11): 6 Schwinn gallery (¾, console, knob, USB, dumbbells, lifestyle) + 5 C6 (side, ¾, console, lifestyle).

## Sunny Health & Fitness SF-B1002 — `sunny-sf-b1002`
- https://sunnyhealthfitness.com/products/sunny-health-and-fitness-sf-b1002-belt-drive-indoor-cycling-bike:
  53.94" L × 19.1" W × 44.49" H (dimension graphic), 49 lb flywheel, 275 lb max.
- Proportions from the ¾ dimension graphic (vertical scale 1.69 mm/px from the 44.49 in arrow): flywheel centre s 396 /
  h 330, crank s 906 / h 320, head s 466 / h 868, saddle top ≈ 962 (low position).
- Details: black frame, chrome flywheel rim with red face, grey SUNNY BIKE crank cover, chrome handlebar / seat posts and
  slider, red pop pins, red transport wheels, bottle cage, SUNNY + HEALTH & FITNESS lettering.
- Estimate: flywheel Ø 400 mm (the ¾ view foreshortens it); tube sections.
- Photos (8): Sunny gallery (side ¾, riders, flywheel, knob, adjustments, lifestyle, dimension graphic).

## Treadmills — shared builder
Static: base / incline frame (front bar, side rails back to the folded stand length, front transport wheels, hinge
brackets), motor hood, uprights ("post" or NordicTrack/Peloton "Z" with a forward top arm), console, display. Folding: deck
frame + foot rails (one side profile: flat bottom, rounded rear end cap), belt channel and belt, rear end caps, rear feet,
wordmark. The "Folded up" pose rotates that assembly about the hinge by the angle that reaches the published folded height
(bisection in `treadFoldAngle`, capped at 88°); the folded footprint is the base stand length (= published folded length)
unless the raised deck reaches further. Hydraulic strut drawn between base and deck.

### Sole F63 (2026) — `sole-f63`
- https://www.soletreadmills.com/products/sole-f63 (+ .json, 32 images): 75 × 34 × 52 in, folded 42 × 34 × 71 in,
  20 × 60 in, 3.0 HP brushless, 18 mm deck, 15 incline levels, white LED console, dial speed control, tablet holder.
- Side profile (2.92 mm/px): uprights foot s 181 / top s 575 h 1051, flat console slab s 158–891 h 1051–1160, hood
  s 15–400 top ≈ 392, belt top ≈ 222 mm (estimate, step-up unpublished), tablet cradle top = 52 in.
- Details: red rear end-cap labels, SOLE on the rails, red hood accent, chrome speed dial, cup holders.
- The long-running 2016–2025 F63 (tall console with fan) is not modelled; the current product page is the source.
- Folded height reached: ≈1790 mm vs 71 in (1803) — the fold angle cap (88°).
- Photos (15).

### Horizon 7.0 AT — `horizon-7-0-at`
- https://www.horizonfitness.com/products/horizon-7-0-at-treadmill: 76 × 35 × 67 in, folded 44 × 35 × 68 in,
  step-up 8 5/8 in, 20 × 60 in, 60 / 46 mm tapered rollers.
- Side profile (3.34 mm/px): upright foot s 144 → top s 561 h 1109 (HORIZON on the side), handrails back to s 912,
  console s 87–528 h 1150–1400 slanted, tablet holder top = 67 in.
- Details: console wings, QuickDial chrome dials on the handrails, blue deck stripe.
- Photos (13).

### NordicTrack Commercial 1750 / 1250 — `nordictrack-commercial-1750`, `nordictrack-commercial-1250`
- https://www.nordictrack.com/treadmills/commercial-1750-treadmill, …/commercial-1250-treadmill (spec JSON in the page):
  footprint 77.3 × 37 × 59.5 in, step-up 10 in, 22 × 60 in belt, folded 44.2 × 37 × 69 in (official dimension drawings,
  NTL17125 / NTL14125); 1750: 16 in pivoting touchscreen, 1250: 10 in tilting touchscreen; same frame.
- Side drawing (2.82 mm/px): diagonal upright foot s 55 → top s 915 h 1095, top arm forward to s 250 h 1122, screen
  housing top = 59.5 in, big rounded rear feet, short hood s 125–330.
- Photos (12 each).

### NordicTrack T Series 10 — `nordictrack-t-series-10`
- https://www.nordictrack.com/product/t-series-10-treadmill: 75.1 × 34.3 × 58.4 in, step-up 8.3 in, 20 × 60 in,
  folded 41 × 34.3 × 68.3 in, 10 in tilting touchscreen (drawings NTL15425). The page lists T Series 10 and 16; the
  catalog's "NordicTrack T Series" row is modelled as the current T Series 10.
- Photos (12).

### NordicTrack T 6.5 S — `nordictrack-t-6-5-s`
- NTL17915 (2016–2022, now redirected to the T Series page): 73.5 × 36 × 54 in, 20 × 55 in, folded 38 in long × 66 in
  high (Treadmill Factory listing + dimension graphic), 5 in display.
- Details: silver uprights, black console with silver side panels and blue LCD, side bins, orange deck accents.
- Estimates: step-up 225 mm, upright positions (no side profile published). Photos (7: Treadmill Factory gallery incl.
  folded dimension graphic) — below the 8-photo target; the product is discontinued and no further gallery was reachable
  (web search budget exhausted).

### ProForm Pro 2000 — `proform-pro-2000`
- PFTL13113 (https://www.proformfitness.ca/treadmills/pro2000-pftl13113): 63 × 39.5 × 80 in (H × W × D), 22 × 60 in,
  SpaceSaver fold, 7 in / 10 in display generations (the gallery shows the LCD + tablet holder console).
- Estimates: step-up 250 mm, folded length 42 in and height 72 in (unpublished), console geometry from the ¾ photos.
- Photos (9).

### Peloton Tread — `peloton-tread`
- https://www.onepeloton.com/tread: 68" L × 33" W × 62" H, 290 lb, 59 × 20 in belt, 23.8 in HD touchscreen; does not
  fold. Measured on the ¾ side render (≈2.47 mm/px): belt top ≈ 222, round Z uprights from the deck front to s 620 h 1150,
  handlebar loop forward to the front, screen top = 62 in.
- Photos (12).

## AssaultRunner Pro / Elite — `assaultrunner-pro`, `assaultrunner-elite`
- https://www.assaultfitness.com/treadmills/assault-runner-pro/ (Pro: 69.7 × 33.1 × 64 in, 280 lb) and
  …/assault-runner-elite/ (Elite: 69.9 × 31.7 × 64.4 in, 289.2 lb); 17 × 62 in running surface, 62 slats.
- Running curve fitted through the Pro side profile (1.914 mm/px): belt top h = 1.4737e-4·s² − 0.3164·s + 618.4 (front lip
  584, dip 449 at s ≈ 1073, rear lip 507). Posts lean forward (foot s 785 / h 300 → top s 665 / h 1215).
- Pro: dark grey covers, red ASSAULT + grey FITNESS, red ASSAULTRUNNER PRO on the oval posts, tubular loop handrail.
  Elite: gunmetal, wing-foil posts, swept bar with twin cup holders and flat side grips.
- Photos: Pro 9, Elite 8 (assaultfitness.com galleries).

## BowFlex Max Trainer M6 — `bowflex-max-trainer-m6`
- https://www.bowflex.com/products/max-trainer-m6: 46" L × 26" W × 64.2" H, 136 lb, ground to low pedal 8.5 in, low to
  high pedal 13 in max. Side profile (3.51 mm/px): tower s 0–440 peak h 1127, fan centre s 246 / h 253 Ø 408 (red ring),
  upper disc s 200 / h 814, pedals s 668–1168.
- Photos (8).

## WaterRower Oak with S4 — `waterrower-oak-s4`
- https://www.waterrower.com.au/waterrower-oak-rowing-machine: 209 × 56 × 53 cm, seat height 30 cm, 30.5 kg; woods
  Oak / Natural ash / Cherry / Walnut as a colour param (same frame). waterrower.com (US/UK) returned 403.
- Side profile of the Natural (2.15 mm/px): rails 17–146 mm, tank Ø 544 centred s 431, A-frame footboard s 616–930, front
  posts to 53 cm, seat carriage s 1563–1832. "Stored upright": the machine stands on its front end (footprint 56 × 53 cm).
- Photos (19: 11 WaterRower AU + 8 Garage Gym Reviews).

## StairMaster 8Gx — `stairmaster-8gx`
- https://www.corehandf.com/products/stairmaster-8gx-1: 58 × 34 × 79 in, 9 in step, 20 levels, 509 lb; Apex 16 in touch
  or LED console (param). Side profile (3.68 mm/px): sprocket bosses s 257 / h 967 and s 1086 / h 287, cover slope along
  the stair line, handrails loop to s ≈ 1215.
- Estimate: four visible steps at 245 mm run. Photos (8).

## Sole E35 (2026) — `sole-e35`
- https://www.soletreadmills.com/products/sole-e35: 70 × 31 × 70 in, 25 lb flywheel, 20 in stride, 10.1 in touchscreen.
  Side profile (3.076 mm/px): housing disc centre s 400 / h 430 Ø 770, mast to console s 420 / h 1480, arm pivot s 584 /
  h 1107, chrome rails s 850–1590.
- Photos (15).

## Not modelled
- Peloton Cross Training series (Bike, Bike+, Tread, 2025): the published lengths (54 in) do not match the side renders
  with the same frame; left for a follow-up.
- NordicTrack T Series 16 and older T Series; the 2016–2025 Sole F63 console.
