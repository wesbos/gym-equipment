# Rack-part registry v2 and the parts it unblocks (#178)

The rack-attachment families (#132, #133, #136) skipped a few products because the registry (#131, #138, plus the
spanning support from #177) could not express them. This note covers the registry additions and the products built
on them. Sources were checked 2026-09-19/20. Every photo listed was downloaded to the agent scratchpad and reviewed
next to `scripts/shoot-part.ts` renders (two rounds per product). Each product was then checked in `/builder` on its
maker's starter (RM-4, RML-390, PR-5000, the stock BOS rack) through the builder's own JSON import, and the Thresher
Pad was also placed through the sidebar.

Existing documents and tests are unchanged. The new products live in each family's files, in a separate
`REGISTRY_V2_PARTS` list (`rack-parts/rack-rollers-pads.ts`, `rack-parts/rack-jcups-safeties.ts`), so the #132/#133
suites keep their original scope. Tests are in `rack-registry-v2.test.ts`, and the registry sweeps in
`rack-registry.test.ts` cover every new entry.

## Registry additions

| Addition | What | Where |
|---|---|---|
| Opt-in rack context | `context: ['holeHeight' \| 'rackWidth' \| 'rackDepth' \| 'rackHeight' \| 'acrossOut']` gives a builder the target hole's height above the floor, the clear inside width and depth, the mounting upright's height, and `acrossOut`, the sign of local +X pointing out of the rack. It is opt-in, so moving an ordinary J-cup never rebuilds it. On 2x3 posts, `upright` (tube through the face) and `uprightWidth` (face width, from #177) already give the post depth. | `rack-part.ts` (`RACK_CONTEXT_KEYS`), `rack-mounts.ts` (`uprightContext`) |
| Floor rule | `mount.floor: { min, max }` is the allowed range for the target hole's height above the floor. The builder receives `holeHeight` and puts its floor contact at `z = -holeHeight`. `rackLimits` and `validateRackMount` refuse other holes with a user-facing message. | `rack-mounts.ts` |
| `crossmember-under` target | Uses the same Darko rail stations and side-hole bolt as `crossmember-top`. The frame is the upright frame laid along the rail: local Z along the rail, local +Y straight down out of the underside, local X along the bolt. A bracket built for an upright therefore wraps the rail unchanged. It pairs across parallel rails and flips sides with the same 180° step as the top target, and it shares its slot with a top-mounted part at the same station. | `types.ts` (`CrossmemberTopTarget.kind`), `rack-targets.ts`, `rack-mounts.ts` (`railMount`, `rackRailMounts`) |
| Hosted targets | `spotter-arm` and `pull-up-bar` targets mount a registry part on another accessory. A host offers `RackHost` frames in its local coordinates: the built-in perforated box safety and straight pull-up bar, and registry entries through `hosts` (Monster 2.0, REP and Stealth spotter arms, the REP 1.25 in bar, and both Rogue fat/skinny bars). The target stores `{ host, unit, frame, station }`. The part resolves from the host instance's pose, so it follows moves, and it is pruned when its host or that station disappears. That covers removing the upright, the host or the rail, unpairing, or swapping to a part without that tube. Its frame has the origin on the host's hole or bar axis, +Y along the host, Z up, and X across. Builders always receive the host section (`hostWidth`, `hostHeight`, `hostTop`, `hostHole`, `hostPitch`). They also receive `hostSpan` when the host has a matching unit across the rack: the signed distance along X to the same station on it. `hostReach` keeps the part on the host's usable span, and the pin is checked against the host hole. A pair takes the host's other unit, or the mirrored station on a single bar (two VOLTRAs on one bar). Unpairing a host re-points parts on its second unit. The host and its hosted part do not collide with each other, and two parts on the same host station share a slot. | `rack-hosts.ts`, `assembly.ts` (validation pass, `pruneHosted`, `settleHosted`), `assembly-collisions.ts` |
| Placement preference | `placement.target` ranks one target kind first for new placements. For example, the bar mounts go on the rack's pull-up bar when there is one, and on the 1 in peg otherwise. | `placement-proposals.ts` (`scoreMount`) |
| Inspector | For parts with more than one target kind there is a "Mount on" select. There is a host-station select for hosted parts, and underside stations for rails. The upright, face and hole fields show only for upright targets. | `src/components/RackPartControls.tsx`, `src/pages/BuilderPage.tsx` |

Saved documents are compatible: an upright target keeps its old shape (kind omitted), and bar mounts saved on the peg
still load and resolve unchanged. The new target fields are validated strictly, and context keys never persist.

## Rogue Monster Mini Feet (`rogue-monster-mini-feet`, 29 gyms)

Sources: [roguefitness.com/rogue-monster-mini-feet](https://www.roguefitness.com/rogue-monster-mini-feet) (RA1998,
3 images), Rogue instructions IS0491 V1 and V2, [Gym Radar](https://gymradar.com/equipment/monster-mini-feet) (7 owner
photos), and the YouTube overview by Basement Brandon (6 frames). 16 photos in total.

| Dimension | Value | Basis |
|---|---|---|
| From the mounting face | 13 in | published; build 13.0 in |
| Width | 3 in (3x3 in 11 ga tube) | published |
| Floor to top of foot tube | 6.75 in | published; build 6.75 in with the lower bolt 2.25 in up |
| Bolts | two 1 x 5 in hex, lowest hole and 6 in above (holes #1 and #4) | published (hardware); spacing from the IS0491 leader lines |
| Plate | 3 x 9 x 3/8 in | estimated |
| Leg and floor tab | leg outer face 11 in out, tab 3 x 5 x 1/4 in from 8 to 13 in | estimated (studio and owner photos) |
| Accessory holes | 1 in: five on top and bottom, four through the sides, one in the leg end | observed |

Modelling: `holes: [0, round(6 in / pitch)]` with 1 in hardware, `floor: 40–100 mm`, and `context: ['holeHeight']`.
The tube stays centred between the bolts. The mitred leg runs to the real floor, so on the BOS 65 mm first hole the
tube top is 7.05 in, not 6.75. Sold and placed as a pair. The 1 in bolts refuse 5/8 in Monster Lite racks by bore.
Finish is MG Black gloss with black-zinc hardware. Round 1 added the fifth top hole, a fourth side hole and darker
hardware.

## Rogue Multi-Use Rack Roller (`rogue-multi-use-rack-roller`, 69 gyms)

Sources: [roguefitness.com/rogue-multi-use-rack-roller](https://www.roguefitness.com/rogue-multi-use-rack-roller)
(RA3136 Monster, RA3173 Monster Lite, 20 gallery images), Rogue Canada listing, and instructions IS0596 and IS0607
(4 pages rendered, including a to-scale side view).

| Dimension | Value | Basis |
|---|---|---|
| Pad | 41 in x 6 in, black vinyl over a 1.5 in Sch 40 core | published |
| Depth / bracket height | 12 in / 8 in, 1/4 in formed plate with UHMW | published |
| Overall | 50.5 in (Monster, 1 in x 4.5 in pins) / 49.5 in (Lite, 5/8 in) | published |
| Rack | 43 in inside-width Monster / Monster Lite racks only | published |
| Peg to detent pin | 4 in (two 2 in stations) | estimated (IS0596 fig. 3-A) |
| Roller axis | 6.4 in ahead of the front face, 4.25 in below the peg | estimated (to-scale drawing, 63 px/in) |
| Ear | 1.75 in radius around a 5/8 in button-head screw, 1 in inside the inner face | estimated |

Modelling: the part mounts on a post's inner side face with `span: 'normal'`, and one unit draws both brackets and
the pad to the facing post. `acrossOut` puts the roller on the outside of the rack: ahead of a front pair, behind a
rear pair. Each bracket has a pin plate on the inner face (UHMW between) with a welded peg through the upright, a detent
pin two stations below with its handle on the inner side, a diagonal gusset carrying the ROGUE panel (a flat recessed
band, no lettering), and the ear plate. The roller follows the actual post spacing but refuses gaps outside
1060–1110 mm, so the 44.9 in PR-5000 is refused and the 42.3 in BOS stand-in and 43 in Monster racks are accepted.
`series` picks 1 in or 5/8 in pins, and `autoFit` chooses by bore. Round 1 had the pin plate on the outer face. The
photos show the welded peg pointing away from the roller and the handle inside, so round 2 moved the plate to the
inner face with a diagonal gusset.

## REP Fitness Utility Seat (`rep-utility-seat`, 32 gyms)

Sources: [repfitness.com/products/utility-seat](https://repfitness.com/products/utility-seat) and its `.json` (PRA-5440,
32 images), plus REP's build video (transcript and 3 frames).

| Dimension | Value | Basis |
|---|---|---|
| Usable top | 32.75 x 11.6 in rubber mat | published; build 32.75 x 11.6 in |
| Capacity / weight / steel | 1,000 lb / 52.8 lb / 11 ga, metallic black | published |
| Racks | 3x3 posts, 47 in outside (41 in between members) or 49 in with the extra liners (43 in) | published |
| Pins | four 1 in and four 5/8 in quick-release pins | published |
| Tray | about 40.25 in steel, 12.25 in wide, 3.25 in deep; two cross ribs; round bars under the hand slots | estimated |
| End plates | 3 in over each member, REP logo window, 5 x 1.5 in stadium hand slot | estimated |
| End wall | one row of nine alternating 1 in and 5/8 in holes on the member's hole axis | observed (video 3:21) |
| Liners | 0.35 in standard, 1.35 in 49 in-rack kit | estimated from the two widths |
| Pad (option) | 33 x 11.5 x 2.5 in CleanGrip | estimated |

Modelling: a hosted `spotter-arm` part that spans the host's matching unit (`hostSpan`). It rests on a pair of box
safeties (stock rack) or registry spotter arms. The end plates sit on the members' tops, the end walls bear on their
inner faces, and one pin per end runs through the member's side hole into the wall. The tray follows the actual
member spacing (1000–1200 mm; REP sells it for 41 and 43 in), and `liners` / `autoFit` pick the kit by rack width.
Without a matching arm across the rack it is refused ("add the pair"), and unpairing the host drops it.

## Darko Lifting Thresher Pad (`darko-thresher-pad`, 48 gyms)

Sources: [darkolifting.com/products/thresher-utility-pad](https://darkolifting.com/products/thresher-utility-pad)
(Darko publishes only 3 images and a GIF, 40 frames), [Gym Radar](https://gymradar.com/equipment/thresher-pad) (3
owner photos), and two YouTube reviews (figjam_reviewer on Stealth Spotters; an unboxing on a Rogue Slinger) for 13
frames. 20 stills plus the GIF.

| Dimension | Value | Basis |
|---|---|---|
| Pad | 8.5 x 13 in, 3 in incl. substrate (2.5 in cushion) | published / reviewer |
| Steel / weight / finish | 3/16 in / 10 lb / wrinkle black | published |
| Angles | 0, 15, 30, 45, 60° | published |
| Fit | 3x3 spotter arms with 1 in holes, two 0.98 in Magpins (sold separately) | published |
| Pivot to lock pin | two arm holes (4 in on 2 in centres) | derived (15° steps of 1 in holes only nearly touch at R ≈ 4 in) |
| Side plate | shield about 5.7 in along the arm, 8.3 in deep; straight rack-side edge 0.7 in past the lock pin; nose 1.8 in rack-ward of and 4.1 in below the pivot | estimated (0° GIF frame, 31.5 px/in) |
| Pad position | underside 3.6 in above the pivot, centre 2.5 in rack-ward | estimated (0° frame) |

Modelling: a hosted `spotter-arm` part. The plates straddle the host tube at `hostWidth` plus UHMW liners (black, red
or yellow). The pivot Magpin is at the station, and the lock pin is two host holes toward the rack (`2 × hostPitch`),
so the lock-hole arc follows the host pitch. `angle` turns the plates and pad about the pivot, raising the rack-side
end. Hosts are the Rogue Monster 2.0, REP and Stealth arms (1 in holes) and the stock BOS 75 mm perforated box safety
(25 mm holes on 50 mm, the stand-in for a 3x3 arm). SAML-24 arms have 1/2 in holes and offer no stations. Round 2
reshaped the plate from the GIF frames (the straight rack-side edge, lock holes nearly breaking the scalloped edge,
the nose position, the two 1 in holes near the pad and the D cut-out position), pillowed the cushion's top edge, and
gave the Magpins round polished heads as in Darko's photos.

## Moved to the new targets

- **Darko QuickMount** (`darko-quickmount-voltra`): now also takes `crossmember-under`, hanging a VOLTRA under an upper
  rail as in the Gym Radar owner photo. The Magpin runs through the rail's side hole. Upright placements are
  unchanged and remain the default.
- **Beyond Power Adaptive and Fixed Bar Mounts**: now also take `pull-up-bar`, and new placements prefer it. On a bar,
  the clamp centres on the bar axis without the peg. The Adaptive clamp's fixed lower jaw carries the bar, so the
  clamp drops by (bar radius − 1/2 in). The Fixed mount's spacer shells fill the 2 in bore down to the bar. The
  published clamp ranges (16–51 mm, 1–2 in) are enforced. Documents saved on the 1 in peg keep working.

## Skipped

- **Titan Rack Mounted Leg Roller on the T-3's 2x3 posts:** researched from Titan's manual and the 10-image gallery.
  Titan includes a 1 in nylon spacer for the T-3's short side (the pin crosses 2 in through a side face). Through the
  2 in front face it crosses 3 in like an X-3. The existing #132 test asserts that every rollers-pads part is refused
  on the T-3 (`rack-rollers-pads.test.ts`, "2x3 and 2x2 posts are refused"), and #178 asks to keep existing tests
  unchanged. Enabling the T-3 therefore needs a follow-up that updates that assertion. The context it needs (`upright`
  and `uprightWidth` on 2x3 faces) is already there.
- **REP Selectorized Lat Pulldown & Low Row (4000/5000) and the plate-loaded rack lat/row (PRA-4700/5702):**
  researched from the REP product JSON (38 photos) and the official dimension drawing:
  - 95.7 / 83.6 in tall (93 / 80 in racks), adding 3.3 in of height.
  - 39.0 x 28.4 in footprint, adding 27.5 in of depth on a 4-post (19.5 in with the Rear Base Stabilizer, 8.5 in on a 6-post).
  - 200 lb stack at 1:1, upgradeable to 300 lb.
  - The top member sits on the rear top crossmember, the tower stands behind the rear uprights, and the base bolts under a required 41.3 in Rear Base Stabilizer.
  
  The registry now provides the rack width, height and hole height, but a faithful build is a floor-standing machine
  with its own cable path, pulleys and stack. It also needs the Rear Base Stabilizer, and the profile width conflicts
  with it: 44.9 in in the repo against 41.3 in implied by REP. That belongs in the rack-system layer (like ARES and
  Athena in `parts/cable-systems.ts`), so it is left for a follow-up.
