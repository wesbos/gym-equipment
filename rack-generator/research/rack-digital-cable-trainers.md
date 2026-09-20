# Rack-system cable machines and the last rack profiles (#178, #136, #122, #130)

This note covers the rack and system leftovers from four issues:

- the Titan leg roller on T-3 posts;
- the REP selectorized and plate-loaded lat pulldown & low row;
- the Rogue Monster Rhino + INDY functional trainer;
- the Fringe Sport Dane 2.0;
- the Fitness Reality 810XLT and Fray Fitness Savage Series F-1 racks.

Sources were checked 2026-09-20. For every product I downloaded the photos, manual pages and renders listed below and looked at each one. Each product then went through two render-vs-photo rounds in `/builder`, loaded through its own JSON import on the maker's starter. Tests are in `rack-digital-cable-trainers.test.ts` and `rack-rollers-pads.test.ts`, and the registry sweeps in `rack-registry.test.ts` cover every new entry.

## Why these are registry v2 rack parts, not system-layer systems

ARES, Athena and Kraken live in the system layer (`systems.ts`), which hard-codes their families, profiles and bays and has its own UI (`CableSmithControls.tsx`). None of the four machines here bolts into a bay that way:

- **REP lat pulldown:** bolts to the rear uprights' inner faces through its Rear Base Stabilizer, and its top member sits on the rear top crossmember.
- **Rhino + INDY:** fills the rear bay of a Monster rack.
- **Dane 2.0:** a stack in each side frame.

The registry v2 context (`rack-part.ts`) already provides the facing post (`uprightSpan`), the hole height, the rack height and `acrossOut`. So each machine is a registry rack part mounted at a real upright hole. Pairing, moves, undo, save, swap, collisions, GLB and 3MF come for free. Three small, general additions were needed:

| Addition | Where | What |
|---|---|---|
| `rowSide` context | `rack-mounts.ts` (`uprightContext`) | +1 for the rearmost post of its column, 0 for a middle post (six-post racks), -1 for a front or lone post. |
| `columnReach` context | same | Centre distance to the farthest post in the same column, so a trainer can reach the front uprights. |
| `mount.overTop` | `rack-part.ts`, `rack-mounts.ts` (`rackLimits`) | For floor parts whose frame rides over the rack top (a top member, top pulley plates). The upright top no longer limits their hole range; `validate` checks the rack height instead. |

Profiles gained three opt-in additions. Existing profiles build unchanged.

- `baseColor`: a factory colour for the base parts, for two-tone frames.
- `starter.rearLower`: only a low rear brace, with no side lower crossmembers.
- `starter.attachments`: rack parts that ship with the rack, placed with their autoFit params.

The first-hole range now allows up to 320 mm, because the 810XLT's first hole is 12 in up.

## Titan Rack Mounted Leg Roller on the T-3 (`titan-rack-mounted-leg-roller`)

Sources:

- [titan.fitness product](https://titan.fitness/products/rack-mounted-leg-roller-fits-t-3-and-x-3-series) and its `.json`. There are 10 images: the dimension drawing, installs on red X-3/T-3 posts, and a knob close-up (402100_09).
- The body text: "A 1" spacer is included for mounting on the short side of T-3 uprights."

The T-3 has 2x3 posts with the 2 in face forward, so:

- **Through the 2 in front face:** the pin crosses 3 in, exactly as on an X-3.
- **Through a 3 in side face:** the pin crosses only 2 in, so the builder draws the 1 in black spacer between the back face and the knob. The knob and the pin end stay where a 3 in tube would put them (tested).

Fit is 3x3 (X-3) or 2x3 (T-3). 2x2 posts are refused. The #132 test that refused every rollers-pads part on 2x3 posts now exempts this roller on the T-3 only. It still refuses it on 2x2 posts and still refuses every other part.

## REP Lat Pulldown & Low Row: selectorized and plate-loaded

IDs: `rep-selectorized-lat-pulldown-low-row` and `rep-lat-pulldown-low-row-plate-loaded`.

**Sources:**

- REP product pages:
  - [selectorized](https://repfitness.com/products/4000-5000-series-lat-pulldown), 11 images plus the dimension drawing `PRA-X702---Dimensions`;
  - [plate-loaded](https://repfitness.com/products/lat-and-low-attachment-4000-5000);
  - [Rear Base Stabilizer](https://repfitness.com/products/rear-base-stabilizer).
- REP knowledge-base pages.
- PDFs, with every page rendered: parts sheets `PRA-5702-S(.PDF, -80)`, manuals `PRA-5702 Assembly Instructions` (33 pp) and `PRA-5702.pdf` (17 pp), and RBS sheets `PR-5002-RBS` and `PR-4002-RBS`.
- REP blog photos and YouTube thumbnails (XzvjOaOJBI0, E3gJg0_-wfA, RErhHiUxtrA).
- In total, 62 images and manual pages. For example: `sel-21b` (rear-left cut-out), `sel-02b` (straight front), `sel-08` (side), `sel-16` (base and RBS), `sel-22` (lat bar and REP insert on the top member), `pl-02` (plate-loaded side), `pl-06` (installed on a PR-4000), `man-sel-step7` (top member).

| Dimension | Value | Basis |
|---|---|---|
| Overall height | 95.7 in / 83.6 in on 93 / 80 in racks | published (drawing); build 95.7 / 83.6 in |
| Footprint | 39.0 x 28.4 in | published; band pegs 28.4 in tip to tip |
| Added depth | 27.5 in behind a 4-post; 8.5 in past the storage posts of a 6-post | published; build 27.5 in / 8.5 in |
| Stack | 20 lb head + 18 x 10 lb = 200 lb, 28 plates for 300 lb, 1:1 | published (parts sheet) |
| Plates | 10 x 4.5 x 1 in | estimated |
| RBS | 3x3 11 ga, 41.3 in, 9.8 in bolt tabs on the rear posts' inner faces, adds 9.5 in | published |
| Top member | 3x3, from 11.5 in inside the rear face to 22.5 in behind; T-head 8 x 3.5 in; saddle plate and two vertical bolts through the rear top crossmember | estimated from photos and manual step 7 |
| Guide rods | 1 in chrome, 6 in apart, 21 in behind the posts | estimated |
| Pulleys | 104 mm aluminium | published (parts sheet) |
| Footplate | 16 x 8.5 x 8 in diamond tread with a V notch and a brushed REP insert | estimated |
| Plate-loaded carriage | 2 in sleeves, horns 18 in tip to tip at 22 in | estimated |
| Hardware | M16 (4000 series, 5/8 in holes) or M24 (5000 series, 1 in holes) | published |

**How it mounts:** the part mounts on a rear upright's inner face (`span: 'normal'`) with two bolts, holes 0 and 2. The build carries the RBS tabs on both rear posts, so the RBS follows the real rear-post spacing, which must be 39–46 in. Other behaviour:

- **Height:** REP makes one attachment per rack height. The 80 or 93 in version follows the rack height, and 90 in racks are refused.
- **Series:** the series param is autoFit from the bore.
- **Rack types:** front posts and non-3x3 racks are refused. On six-post racks the tower stands in the storage bay.
- **Cables:** simplified 1:1 routes, from the stack or carriage over the T-head to the lat pulley, and from the low pulley through the floating block.

**Render rounds:**

- **Round 1:** moved the floating block from just under the beam to about half height, as in `sel-21b`, and grew the plates to 1 in.
- **Round 2:** confirmed the silhouettes against `sel-21b` and `pl-02`.

## Rogue Monster Rhino + INDY Functional Trainer (`rogue-monster-rhino-indy-trainer`)

**Sources:**

- [Rogue product page](https://www.roguefitness.com/rogue-monster-rhino-trainer), plus the add-on and INDY pages.
- Configurator renders for every variant: 4- and 6-post, dual, left and right, with and without shrouds.
- The Rhino Rack Trainer gallery, Web1 to Web10.
- IS0637, "Monster Rhino + INDY Functional Trainer": 76 pages, all rendered. The p53 overview is the main reference.
- IS0611 to IS0626.
- Frames from Garage Gym Reviews "Rogue Fitness' Most Expensive Squat Rack" (aXXjrRJuukA), showing a real 43 in RM-4 Rhino + INDY.
- Rogue's product video.

That is over 30 distinct views. The earlier "only one configurator angle" blocker is resolved.

| Dimension | Value | Basis |
|---|---|---|
| Height | 92 / 102 in on 90 / 100 in racks | published; build 92.0 in on the RM-4 |
| Width | 53 in | published; build 53 in over the shrouds and trolleys |
| Length | rack length + 26 in (79 x 53 on a 43 in RM-4, 106 x 53 on RM-6) | published; build 26 in behind the rear posts |
| INDY | 28 x 10 lb plates per side, 2:1 | published (IS0637) |
| Plates | 10.5 x 4.5 x 1 in | estimated |
| Rhino | 3x6 11 ga upright, two 15.75 in plate posts, 1 in UHMW horn, 7 in pulley deck | published; deck 23.5 in deep, estimated |
| Pulleys | 3.5 to 6 in | published; top plates 6 in, trolley 7 in, estimated |
| Shroud | 19 in long, 3.25 in each side of the side plane, ROGUE wordmark outboard, keyhole grid inboard | estimated from Web6/Web7 and GGR frames |
| Lever handles | 3x3 arms from about 16 in, Multi Grip tips | estimated |

**How it mounts:** on the rearmost upright's inner face, 1 in hardware, facing its partner across a 43 in Monster rack. `columnReach` finds the front uprights, whose swivel trolleys face forward. Other rules:

- A six-post's middle posts are refused, because the trainer fills the rearmost bay, as IS0637 shows on the RM-6.
- The PR-5000 (too wide) and Monster Lite (5/8 in holes) are refused.
- The `sides` param covers dual, left-only or right-only stacks. `trolley` sets the trolley height.

**Render rounds:**

- **Round 1** fixed three things:
  - the 3x6 upright sat against the rear crossmember; it moved 3 in back;
  - the top plates were too tall;
  - the trolley pulley pointed sideways (Rogue's renders show it facing forward).
- **Round 2** checked the result against `cfg-4-rhino_indy-dual` and the GGR frames.

## Fringe Sport The Dane 2.0

The rack is profile `fringe-dane-2`, starter `fringe-dane-2-four-2260.6-762`. The stacks are `fringe-sport-dane-2-cable-stacks`.

**Sources:**

- [fringesport.com/products/the-dane-2-0](https://www.fringesport.com/products/the-dane-2-0), its `.json` (54 images) and the spec table in the page HTML.
- The Gibbon Arms and Fully Loaded bundle pages, whose renders include a near-straight side view (`gb_06`, 19.5 px/in).
- The [3x3 uprights page](https://www.fringesport.com/products/fringe-sport-3x3-uprights).
- The assembly video (u_o6euw6jN8) and Gym Radar owner reviews.
- In total, 95 images.
- There is no manual PDF; Fringe only publishes the video.

| Dimension | Value | Basis |
|---|---|---|
| Overall | 60 x 47 x 92 in with the extension feet | published; build 60 x 47 x 92 in |
| Depth without the feet | about 33 in | published FAQ |
| Uprights | 3x3 (metric) 11 ga, 89 in long, 1 in holes on 2 in | published |
| Stacks | 2 x 160 lb in 10 lb steps with a 5 lb top plate, 1:1, 5.8 ft travel | published |
| Plates | 15.5 x 4 x 0.7 in | estimated |
| Inside size | 30 in depth, 39 in width | estimated |
| Stack centre | 12.5 in ahead of the rear post | estimated (gb_06) |
| Pulley housing | 24 x 6 in with a notched top, three tabs and cut-out FRINGE SPORT | estimated |
| Extension feet | 22 in: 12 in level at 7 in, then a 45 degree leg | estimated |
| Floating pulley | figure-8 at about 42 in | estimated |
| Trolley pulley | red aluminium, facing forward | estimated |

**Structure:** the Dane is modelled as a profile plus a paired rack part that ships with the starter (`starter.attachments`). Each unit mounts on a rear upright's front face and spans to the front upright ahead of it, which must be 24–40 in away. The stack body stops at 18.5 in, so the rack's safeties can still sit above it.

**Render rounds:**

- **Round 1** fixed three things:
  - the housing lettering was mirrored;
  - the D-handle and swivel pulley pointed sideways, where photos show them forward;
  - the width was 60 in, where 47 in is published.
- **Round 2** checked the result against `pdp_53` and `gb_05`.

**Not modelled:** the second rear crossmember at about 63 in and the Gibbon Arms.

## Fitness Reality 810XLT Super Max Power Cage (profile `fitness-reality-810xlt`)

The previous agent could not reach any spec page. These sources were:

- **Wayback copy** of fitnessreality.com: [2021 product page](https://web.archive.org/web/20210307184001/https://fitnessreality.com/fitness-reality-810xlt-super-max-power-rack-cage-with-800lbs-weight-capacity/), with key features and SKU 2810.
- **The Amazon listing** (B01N4I8FOY): 4 gallery images, including the dimension graphic, and the 108 s product video, from which I took 18 frames.
- **Owner's manual 2810.5-031920** (31 pages; overview drawing, parts list and product drawing), from the Amazon "User guide" PDF.

| Dimension | Value | Basis |
|---|---|---|
| Size | 46 in wide x 50 in deep x 83 in with the pull-up bar up, 74.5 in with it reversed | published (Amazon graphic) |
| Amazon figures | 50.5 x 46.5 x 83.5 in | published |
| Frame | 2 x 2 in steel, 1 in holes, 19 safety heights, 800 lb, two rear stability bars | published |
| Manual parts | 2 base frames, 4 uprights, 2 upper frames, multi-grip bar, 2 rear cross bars, 8 L-brackets, M10 hardware | published (manual) |
| Hole pitch / first hole | 3 in / 12 in | estimated: the photos show about 20 holes on 74.5 in posts |
| Inside size | 40 x 19 in | estimated (inside the published footprint) |
| Feet | 3 x 3 in charcoal, 50 in long, with gussets and caps | estimated from the manual drawing and photos |
| Colour | silver posts on charcoal feet | photos |

**Modelled differently:** the multi-grip pull-up bar is a straight 1.25 in bar, and the two curved rear braces are straight top and low rear crossmembers.

## Fray Fitness Savage Series F-1 (profile `fray-savage-f1`)

The store is closed; frayfitness.com now redirects to an unrelated site. The sources were:

- **Wayback product pages:**
  - [F-1 Power Rack (2023-12)](https://web.archive.org/web/20231205061451/https://frayfitness.com/products/savage-series-f-1-power-rack);
  - [F-1 Style A (2025-01)](https://web.archive.org/web/20250125155700/https://frayfitness.com/products/savage-series-f-1-power-rack-style-a);
  - [F-1 Style B (2025-01)](https://web.archive.org/web/20250120122856/https://frayfitness.com/products/closeout-savage-series-f-1-power-rack-style-b).
- **Archived CDN renders:** 25 renders across short/tall, 37/49 in and six colours, including the F-1 + FB-01 bundles.

| Dimension | Value | Basis |
|---|---|---|
| Size | 94 in tall (79.5 in short) x 48 in wide x 37 or 49 in deep | published |
| Frame | 3 x 3 in 11 ga posts, 1 in four-way holes on 2 in with laser-cut numbers, 1 in hardware, rated 1,500 lb | published |
| Included | pull-up bar, J-cups, pin-pipe safeties | published |
| Inside size | 42 x 31 / 43 in | estimated from 3 in posts and the 48 / 37 / 49 in outside sizes |
| Plates and first hole | bolt-down plates tucked inboard; 2.5 in first hole | estimated from renders |
| Nameplate | grey arched logo plate on the rear crossmember | renders; no artwork |

## Tests

- **`rack-digital-cable-trainers.test.ts`:**
  - builds every entry at the first, middle and last option, with and without rack context;
  - checks the published envelopes on the makers' starters: REP 95.7 / 83.6 in, 27.5 in and 8.5 in; Rhino 92 in, 53 in and +26 in on the RM-4 and RM-6; Dane 60 x 47 x 92 in; 810XLT and Fray footprints;
  - checks the fit rules (front posts, wrong heights, bores, middle posts, spans) and the 810XLT's two-tone base and low rear brace.
- **`rack-rollers-pads.test.ts`:** the Titan T-3 case, spacer geometry and a side-face placement on the T-3.
