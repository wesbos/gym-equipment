# Rack rollers, seats & pads (#132)

Rack attachments in the `Rollers & pads` section: metadata in `rack-parts/rack-rollers-pads.ts`, builders in
`parts/rack-rollers-pads.ts`, tests in `rack-rollers-pads.test.ts`. Sources checked 2026-09-19. Popularity (gyms that
own it) is from Gym Radar, Sep 2026. Every photo listed was downloaded to the agent scratchpad and reviewed as a contact
sheet next to `scripts/shoot-part.ts` renders (two rounds per product), then checked mounted in `/builder` on the
maker's rack starter (RM-4, RML-390, PR-5000, PR-4000, Manticore).

Every product here is sold for square 3 x 3 in uprights, so every entry's `validate` refuses 2x2 and 2x3 posts
(R-3, T-3, T-2, PR-1100) with a fit message. The BOS 75 mm tube is accepted as the nearest stand-in. The pin classes
use `PIN_1IN` / `PIN_5_8IN` against the rack bore, and `autoFit` picks the 5/8 in variant on 5/8 in racks where the
maker sells one.

## REP Pegasus attachment (`rep-pegasus`, 77 gyms)

Sources: [repfitness.com/products/pegasus-seat](https://repfitness.com/products/pegasus-seat) (spec table and FAQ; 29
gallery images: studio 3/4 view, side view with the seat vertical, lat pulldown, rows, leg extensions, close-ups of the
arc plates, magnetic pin, roller ends and the sleeve on PR-5000 and Athena uprights). PRA-5750 (5000, 1 in holes) and
PRA-4750 (4000, 5/8 in holes).

| Dimension | Value | Basis |
|---|---|---|
| Total height | 16.3 in (rollers lowest) | published; build 16.4 in |
| Height on upright (sleeve) | 8.9 in (5000) / 9.8 in (4000) | published |
| Total length / width | 27.8 in / 24.6 in | published |
| Extension from the rack | 24.8 in | published (seat far edge) |
| Seat pad | 13.6 in long, 11 in tapering to 7.5 in, 2.5 in thick | published |
| Seat angles | 0, 12.5, 25, 40, 55, 70, 90° | published, param `seat` |
| Main arm angles | 0, 12.5, 25, 40° | published, param `arm` |
| Leg rollers | 5.8 in diameter, 3-8 in above the seat in 1 in steps | published, param `roller` |
| Sleeve box, 122 mm in front of the face | | estimated from the studio and side photos |
| Arm pivot 128 mm out, 120 mm below the pin; seat pivot 100 mm in from the seat's rack end | | estimated; the side photo with the seat vertical puts the pivot about 340 mm from the face |
| Roller post 88 mm in front of the face; rollers 277 mm each | | estimated so the rollers clear the upright and span 24.6 in |

Modelling: a C-sleeve box slides onto the upright from the front and houses the roller post; the magnetic
mountain-logo pin crosses the side plates and the upright's side holes (`pinAxis: 'across'`, `mainStations`). The
main arm pivots under the box front; the zinc arc plates carry the seat pivot; the seat rotates with the arm and then
by the seat angle, so at 90° it stands as a chest pad facing out (the far end drops, as in the rows photo). Finishes:
metallic black powder coat, CleanGrip seat and rollers, grey stitching and piping, zinc pins and arc plates, white REP
lettering as flat plates. The 19.3 in lowest seat height depends on the rack's first hole and is not asserted.

## REP Leg Roller 2.0 (`rep-leg-roller-2`, 34 gyms)

Sources: [repfitness.com/products/leg-roller-2-0](https://repfitness.com/products/leg-roller-2-0) (PRA-5713, 11 photos:
single and pair studio shots, split squats, Nordics, sit-ups, lat pulldown hold-down, close-ups of the knob and the
molded pad end). PR-5000, Omni and Apollo only; no 4000 version.

| Dimension | Value | Basis |
|---|---|---|
| Total length (un-installed) | 21.74 in | published; build 552 mm on a 3 in tube |
| Extension from the upright | 18.04 in | published |
| Roller | 15.08 in x 5.65 in, rotating molded PU foam, CleanGrip vinyl | published |
| Frame / knob | nickel shaft, black e-coat knob | published finishes |
| Shoulder collar 38 x 26 mm, pad hub 58 x 14 mm, knob 52 mm x 17.8 mm | | estimated; the knob thickness follows from 21.74 - 18.04 - 3 in |

The 1.0 proof entry (`parts/rep-leg-roller.ts`) uses a lynch pin; the 2.0 threads a knurled knob onto the stud behind
the far face. The builder reuses the 1.0's revolved-profile stack (`revolveProfile`) and adds the molded end caps with
the radial pattern, seam rings and a long seam.

## Rogue Monster Single Leg Roller 2.0 (`rogue-monster-single-leg-roller-2`, 50 gyms)

Sources: [roguefitness.com/rogue-monster-single-leg-roller-2-0](https://www.roguefitness.com/rogue-monster-single-leg-roller-2-0)
(RA1670; only five gallery images: mounted 3/4 view, collar and nut close-ups, vinyl grain, gathered end). Gym Radar and
Garage Gym Reviews had no further photos of this item, so this entry was checked against five photos, not eight.

| Dimension | Value | Basis |
|---|---|---|
| Length | 22 in total, 16 in pad | published; build 558 mm on a 3 in tube |
| Pad diameter | 4.25 in (tolerance +0 / -0.5 in) | published |
| Rod | 1 in steel threaded rod, proprietary matte black | published |
| Two machined set-screw collars, knurled screw-on nut | | published features; sizes 2 in x 20 mm and 2.5 in x 1 in estimated |

## Rogue Monster Lite Rack Mount Leg Roller (`rogue-monster-lite-leg-roller`, 26 gyms)

Sources: [roguefitness.com/rogue-monster-lite-rack-mount-leg-roller](https://www.roguefitness.com/rogue-monster-lite-rack-mount-leg-roller)
(RA0725; six images: mounted front and side views, studio 3/4 view with the orange detent pin, bracket close-up, vinyl).

| Dimension | Value | Basis |
|---|---|---|
| Overall / pad | 17.75 in / 13 in | published |
| Pad diameter | 5 in | published |
| Detent pin | 0.625 in, orange pull ring | published |
| Hanger plate 3 x 8.6 in, 1/4 in; top pin; lower wrap channel three 2 in stations down | | estimated from the studio shot |

The top pin hangs in the target hole; the detent pin runs across the channel flanges and the upright's side holes, so
`mainStations` refuses Westside half holes. Five of the six photos are studio shots; no other sources had photos.

## Bells of Steel Split Squat Leg Roller (`bells-of-steel-split-squat-leg-roller`, the issue's "Titan/BoS rack-mount leg roller")

Sources: [bellsofsteel.us/products/split-squat-leg-roller-attachment](https://bellsofsteel.us/products/split-squat-leg-roller-attachment)
(11 images across the 2.3 in, Hydra and Manticore versions, split squat and curl lifestyle shots) and the BSS3-RA
assembly manual cover. BSS2-RA-HDR (Hydra, 5/8 in) and SSQ2-RA-MTC (Manticore, 1 in).

| Dimension | Value | Basis |
|---|---|---|
| Pad | 4 in x 16 in, vinyl over high-density foam | published |
| Total length | 22-3/4 in | published; build 574 mm on a 3 in tube |
| Open bracket 90 mm tall, 34 mm flanges; zinc bushings 44 mm; chrome star knob 72 mm | | estimated |

Version 2.0/3.0 uses an open bracket with a threaded pin and star knob (published note). Param `hardware` picks Hydra or
Manticore; `autoFit` uses the rack bore. The 2.3 x 2.3 in version (BSS3-RA) does not fit a 3 in tube and is not modelled.
The Titan roller named alongside it in the issue was not added: Titan's store had no rack-mount leg roller listing.

## Rogue Monster Pritchett Pad (`rogue-monster-pritchett-pad`, 49 gyms)

Sources: [roguefitness.com/rogue-monster-pritchett-pad](https://www.roguefitness.com/rogue-monster-pritchett-pad)
(RA2849, six images), [roguefitness.com/rogue-monster-lite-pritchett-pad](https://www.roguefitness.com/rogue-monster-lite-pritchett-pad)
(RA2850, six images including the side-on product shot and landmine and dumbbell rows), and the
[Garage Gym Reviews review](https://www.garagegymreviews.com/rogue-pritchett-pad-review) (seven photos: construction,
foam, UHMW, carry handle, incline press, curls, landmine row).

| Dimension | Value | Basis |
|---|---|---|
| Extension from the upright | 33 in | published; build 837 mm |
| Pad | 12 in long, 11 in wide at the bottom, 8 in at the top, 2.25 in thick, self-skinned PU | published (GGR confirms the foam) |
| Arm | 3x3 in 11-gauge, two gussets, UHMW-lined clasp and handle | published |
| Arm path: 353 mm horizontal run, 520 mm at 40°, 330 mm at 102° | | estimated from the side-on photo, with the run lengthened to meet the published 33 in |

The lifter stands with the rack behind them and straddles the low arm, so the upper riser leans back toward the rack
and the pad faces up and back (outer 8 in end higher), as in the Monster Lite side photo and the row photos. Param
`series`: Monster (welded 1 in pin in the clasp) or Monster Lite (5/8 in hitch pin with a clip behind the upright);
`autoFit` picks it from the bore. The ROGUE lettering is laser cut; it is shown as a flat dark plate.

## Bells of Steel Seal Row Pad (`bells-of-steel-seal-row-pad`, 61 gyms)

Sources: [bellsofsteel.us/products/seal-row-pad](https://bellsofsteel.us/products/seal-row-pad) (18 images across the
2.3 in, Hydra and Manticore versions: studio views at several angles, top view, bracket close-up, flyes, incline work,
rows, the seat use on a Manticore rack).

| Dimension | Value | Basis |
|---|---|---|
| Pad | 16 x 12 in, 2.25 in thick | published |
| Selector wheel depth | 7.1 in, 7 angles | published |
| Bracket length | 11.5 in, 11-gauge, powder coat | published |
| Angles -15° to 75° in 15° steps | | estimated (BoS does not publish them) |
| Lower clamp rod and knurled knob four 2 in stations below the top rod | | estimated, gives the 11.5 in bracket |
| Pad outline: square rack end, 118 mm radius far corners | | estimated from the top view |

Holes `[0, -4]`: a plain top rod and a clamp rod with a knurled knob in front and a nut behind. The 2x3 in arm dog-legs
down from the pivot bolt and carries the pad board. Param `hardware` (Hydra 5/8 in or Manticore 1 in) and `angle`.
The 2.3 in version is not modelled.

## Prime Fitness Prodigy Adjustable Stability Pad (`prime-prodigy-stability-pad`, 27 gyms)

Sources: [primefitnessusa.com/products/prodigy-adjustable-stability-pad-attachment](https://www.primefitnessusa.com/products/prodigy-adjustable-stability-pad-attachment)
(item 1207642). Prime publishes only three renders (studio 3/4 view, adjustment-range ghost view, on an HLP300) and a
product video; no retailer or review photos were reachable, so this entry was checked against three images.

| Dimension | Value | Basis |
|---|---|---|
| Length | 38 in shortest to 49 in, 12 positions | published, param `length` |
| Pad | half-moon, 13-3/4 in long, vertical or horizontal | published, params `orientation` |
| Adjustments | 9 pad angles, 11 width (swing) positions | published count; values ±60° / ±75° in 15° steps estimated |
| Mount | 3x3 in upright, 1 in holes on 2 in centres | published; `validate` checks the 2 in pitch |
| Pad section 7 x 4.25 in; 2x3 in outer arm, 1.5x2.5 in inner arm; pivot 62 mm in front of the face | | estimated from the renders |

Finishes: textured black, zinc inner arm, chrome 1 in pin with a rubber tip (a review mentions it), bronze pivot
bushing, green pop-pin knobs.

## Not shipped

- **Rogue Multi-Use Rack Roller (69 gyms):** a 41 in roller (50.5 in overall) whose formed channels pin to two uprights
  across the rack. The rack-part contract mounts on one upright (or one rail station) and the builder gets no rack
  width, so a spanning part cannot be placed honestly. It needs a two-upright span mount in `rack-mounts.ts`.
- **REP Utility Seat (32 gyms):** a 32.75 x 11.6 in platform that spans two uprights (47 in and 49 in outside-width
  liner kits) or rests on safeties, spotter arms and ISO arms. Same span limitation.
- **Darko Lifting Thresher Pad (48 gyms):** it straddles and pins to a 3x3 spotter arm, not an upright; there is no
  spotter-arm target in the registry. Darko also publishes only four photos.
