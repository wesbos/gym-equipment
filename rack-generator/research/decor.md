# Room decor (#201)

Parts for the room around the equipment, modelled for Coop's (Garage Gym Reviews) basement gym and reusable in any
room. Source video: [I'm Building The Home Gym Of My Dreams!](https://www.youtube.com/watch?v=QCfulhfSSNo). Timestamps
below are from that tour. His frames are only used for reference and are not in the repo.

## How the parts attach

- **Wall items** (`wall-parts/decor.ts`, section *Wall decor*): windows, doors, the bay window, banners, the Sonos Five
  and the TV. Windows, doors and the bay declare an `opening` (the finishes' wall-cut contract from #200), so the wall
  finish is cut away and their returns, sashes and glass sit behind the wall plane. `standoff` builds a window or door
  proud of a decor wall section instead (nothing is cut on the room wall then).
- **Floor items** (`floor-parts/decor.ts`, section *Room decor*): posts, wall sections, Levrack, the PLAE rack and
  furniture. Ceiling-hung parts (beam, linear LED, fan, ring rig) are floor items with a `ceiling` height param. Their
  footprint is their plan outline and they are `underlay`s, so they raise no overlap warnings with equipment under them.
  The Levrack overhead frame is an underlay too, because it stands over a workstation.
- **Self-lit surfaces:** `MaterialSource.emissive` (0–1) makes a `source` material glow in its own colour. It is used for
  LED lenses, window glass and screens. `resolveMaterial` returns THREE-ready `emissive`/`emissiveIntensity` only when
  it is set, so every other part is unchanged.
- **Lettering** is a plain block-capital stroke font (`parts/decor-kit.ts`, A C D E I K L M N R S T V W Y and space) with
  a weight option. It is not any maker's lettering, and there is no logo art.

## Products and sources

| Part | Source | Published | Estimated |
|---|---|---|---|
| Big Ass Fans i6 | [bigassfans.com/i6](https://bigassfans.com/i6-ceiling-fan/), Ferguson and Build.com listings | 6 aluminium airfoils; 60/72/84/96″ spans; flush or downrod | Motor 320–380 mm × 95 mm, canopy 150 mm, blade planform 115 → 85 mm. Coop's fans are black 6-blade fans (0:42, 7:00–7:15, crop checked); 5- and 8-blade variants are params |
| H.E. Williams linear LED | Coop at 7:00: "H.E. Williams … 8 ft or 4 ft sections" | 4 ft / 8 ft modules | 70 × 60 mm extrusion, joints every 4 ft |
| Sonos Five | [sonos.com/shop/five](https://www.sonos.com/en-us/shop/five) | 203 × 364 × 154 mm | Corner radius, grille field, 26 mm bracket |
| Levrack mobile storage | [levrack.com 8 ft](https://levrack.com/product/8ft-levrack/) | 7/8/10/12 ft systems 6″ over nominal; 7/8 ft tall; 30/36/48″ deep; cabinets 15″ and 18″; Stealth Grey | Upright 3″, header 160 mm, red handles, castors |
| Levrack Workstation | [levrack.com workstation](https://levrack.com/product/levrack-workstation/) | 4/8 ft, 11 ga steel top on a pallet-rack upright and two beams | Top at 36″, 30″ deep, drawer bank, slatwall back and end panels (1:45–2:57) |
| Levrack overhead frame | levrack.com | 7–12 ft frames, 7/8 ft tall (plus the Workstation's 4 ft) | Wire deck, header, end brace, under-shelf LED (1:32, 2:52) |
| PLAE storage rack | Coop 2:57: "3×3 uprights with 11-gauge steel … offset holes" | 3×3″ 11 ga | 80 × 24 × 84″, four shelves, top pegs, low-poly kettlebells with coloured bands |
| Window | Generic vinyl | Nominal inch sizes | 70 mm casing, 55 mm sash frame, 130 mm drywall return. Hopper (clerestory, 8:30), slider, picture, casement |
| Bay window | Coop's bay (8:35–8:45, construction 9:45) | – | 45° sides, 34″ side windows, 72″ picture window, sill 900, head 2200, birch wainscot below |
| Interior door | Generic six-panel | 80″ slab, 28–36″ widths, 1-3/8″ thick | 64 mm casing, black lever at 36″ |
| Banners | Coop's cove (1:16) and treadmill wall (10:45) | – | "American Made" 72 × 22″ navy felt with a red border; "Stay Weird" 60 × 36″ cream canvas with a black border, bold two-line lettering; brass grommets |
| Birch-clad beam, lally post | Coop 10:05–10:20 (1/8″ reveals, stainless screws), 5:27 | Lally columns 3-1/2″ / 4″ | 400 × 350 mm box, 8 ft panel joints |
| Ceiling rig | Coop 5:20–5:25, 10:35 | – | 290 mm birch board, eye bolts in pairs 500 mm apart, rings on blue straps, green bars on lime straps, rope |
| Desk, step stool, ladder, TV, wall section | Generic | – | As in the tour (8:35, 0:45, 8:32, 0:55); sizes are ordinary furniture sizes |

## Coop v2 floor plan (scripts/gyms/coop-garage-gym-reviews.ts)

Built from many frames rather than a scan, so every position is an estimate from known equipment sizes (the 3-bay rig,
4 ft birch sheets, 80″ doors, the 1.85 m turf lane). Everything is laid out from the beam line `XB` and the back wall:

- **Main room:** 8.45 × 13 m, 2.75 m ceiling. The beam runs the full length on three lally posts, with the rig just to its
  right on the back wall (5:27, 6:12, the construction shot at 4:53).
- **Turf bay:** the lane runs 30 cm off the left wall from 1.5 m in front of the back wall to the front wall, with the ring
  rig over it. Two LED runs and two fans are between the rig and the beam (0:42, 7:00). The PLAE stencil runs along the
  lane (`textRotation: 90`, new in this PR).
- **Storage cove:** a 3.6 × 4.8 m recess behind the left wall line at the front. The builder room is a rectangle, so it
  also takes in the cove, and a 3.6 m thick wall section fills the strip behind the main left wall. On the cove's back
  wall are the PLAE rack under the "American Made" banner and the pegboard. The attachment hangers and stool are on the
  front wall inside the cove. The Levrack cabinets, Workstation and overhead frame are along the rig-side return,
  workstation at the mouth (1:16–3:20, 4:48).
- **Right wall:** three 48 × 22″ hoppers right above a 1.5 m wainscot (8:32 puts the chair rail at about 55% of the wall
  height). There is a Sonos Five at each end and the bay alcove near the front, with the desk inside it.
- **Front wall:** the entrance door at the turf end, the dumbbells and TV (0:40, 0:55), and the treadmill under "Stay Weird"
  in the right corner. The speaker is beside the banner, with the bay's side window beyond (10:45).

Known gaps: the PRIME rig and its plate-loaded attachments are shown as the extended Rogue Monster rig. His hip-thrust
machine, vertical knee raise, Sorinex machine, Milwaukee Packout stack and 3D printer are not in the catalog. The
pegboard sits on the cove's back wall rather than along the corridor side.
