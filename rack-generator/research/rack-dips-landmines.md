# Dips & landmines (#134)

Thirteen rack attachments: five dips, the Mutant Metals handles, the Fringe Swan Neck swivel mount and six landmines. They live in
`rack-parts/rack-dips-landmines-{dips,landmines}.ts` (metadata and shared layouts) and
`parts/rack-dips-landmines-{dips,landmines,kit}.ts` (builders). Sources were checked on 2026-09-19. Popularity is the
number of Gym Radar owners.

For every product, the manufacturer gallery plus review and retailer photos (8 or more each) were downloaded to the agent
scratchpad and compared with renders in two rounds. The committed evidence is in `docs/evidence/issue-134/`.

## Modelling conventions

- **Frame.** Source frame from `rack-part.ts`: the origin is on the post centreline at the target hole, +Y points out of
  the mounting face, and Z is up.
- **Cup-style dips.** The UDA, Matador, REP Dip Station and BOS Y Dip straddle the post with flanges on its two side
  faces. They pin *across* it through the side holes (`pinAxis: 'across'`) and project along +Y.
  - The Dip Station and Y Dip also take a lower lock pin, so their `holes` are `[0, -k]`.
- **Landmine kinematics.** Every photographed landmine rotates about its rack pin. Two families follow:
  - **`'face'`** (Rogue, Monster 2.0, BOS 5/8 in, Adroit): the axle is normal to the face, so the sleeve sweeps in the
    plane of the face, and a second clevis hinge tilts it out of that plane. `angle` is the elevation in the face
    plane. `side` picks the direction: 0 is the viewer's right when facing the mount (local −X), 1 is local +X.
  - **`'out'`** (REP landmine, BOS Manticore 2.0): a horizontal hinge on the bracket lets the sleeve rise straight out of
    the face.
  - One pure layout per landmine (`landmineLayout`) drives the builder pose, the collision bodies and the vertical
    extent. The moving joint is described by stadiums inscribed in the solids, so the posed bodies never exceed the
    real parts at any angle.
- **Fit rules** (`validate` / `autoFit`) follow each maker's compatibility list:
  - 3x3-only parts refuse 2x2/2x3 posts.
  - 1 in and 5/8 in versions are picked from the bore.
  - The Rogue Landmine takes the 6 in bolt set on 2x3 posts and the band peg and collar on 3x3 posts.
  - Tests place every part on the RM-4, RML-390, R-3, PR-4000, Manticore and Hydra starters.

## Mutant Metals Ultimate Dip Attachment (`mutant-metals-ultimate-dip-attachment`, 159)

Sources:
- [Rogue RA2860/RA2861](https://www.roguefitness.com/mutant-metals-ultimate-dip-attachments-uda), including the spec
  drawing with grip widths
- [Mutant Metals hybrid UDA](https://mutantmetals.com/products/p/cfnu97n1rgnzjbpfuvh4ruempgpsvo), body-only page, and
  stainless handles page

Photos: 38 (MM gallery 01–18, Rogue 20–41). The best comparisons are 37 (hero), 23 (front) and 36 (drawing).

| Dimension | Value | Basis |
|---|---|---|
| Frame width / height / reach | 21.25 × 6.75 × 24.5 in | published (Rogue) |
| Frame tube / plates | 2x2 in 11 ga / 3/8 in | published |
| Handles | 1-3/8 in (35 mm) × 18 in knurled, 22 in overall, 1 in × 4 in threaded pin, knurl marks every 6 in, 30° included | published |
| 45 mm handle | Mutant Metals upgrade | published |
| Grip ranges | 11.5–20 / 15–24 / 19–27.5 in | published; hole half-widths 146 / 190.5 / 241 mm derived |
| Mount | 1 in welded stainless J-cup pin (Monster), 5/8 in detent pin (Monster Lite) | published |
| Wing sweep | 15° each | derived from the 30° handle angle |
| Plate outline, spine 89 mm, centre segment 185 mm, wings 170 mm | — | estimated from the drawing ratio and photos |
| Colours | textured black, red, charcoal, dark blue, gun metal; stainless or matte black handles | published |

Not modelled:
- the flipped storage mode
- the laser-cut MM monogram (logo artwork)

## Mutant Metals Handles (`mutant-metals-handles`, 84)

- **Sources:**
  - [Mutant Metals UDA stainless handles (pair)](https://mutantmetals.com/products/p/7268iypgducmtys8vuxi7f7fpyshqr)
  - the [Gym Radar item](https://gymradar.com/equipment/mutant-metals-handles), which describes them as threaded
    handles for the UDA and ARC; owners use them in rack and spotter-arm holes
  - UDA gallery photos 05, 06, 16–18, 20, 21, 30 and 31
- **Published:**
  - 22 in overall
  - 4 in pin section, compatible with 2 and 3 in racks
  - 1-3/8 in × 18 in knurled grip with marks every 6 in; 45 mm option
  - 1-8 thread for Rogue knurled knobs
  - 275 lb per handle
  - stainless, or Rogue matte black
- **Modelling:**
  - The same handle as the UDA model runs straight through a rack hole on its 1 in pin, with the knurled knob behind the
    far face.
  - Sold and placed as a pair, straight out of the front uprights at dip height.
  - 5/8 in racks refuse the 1 in pin.
  - `validate` refuses posts larger than 3 in.

## Rogue Monster Lite Matador (`rogue-monster-lite-matador`, 87)

Sources:
- [RA0383](https://www.roguefitness.com/rogue-monster-lite-matador) and [Monster RA0116](https://www.roguefitness.com/rogue-monster-matador)
- both assembly manuals

Photos: 8 plus review photos. The best comparisons are 01 (hero), 07 (plan view) and 03 (side).

| Dimension | Value | Basis |
|---|---|---|
| L × W × H | 24 × 27 × 10 in | published |
| Handles | 1-7/8 in, 17.75 in c-c at the crossbar, 24.75 in at the tips (≈11.5° per side) | published / derived |
| Channel | 3x3 7-gauge, single through pin | published |
| Pin | 5/8 × 4 in detent pin (orange loop); Monster: 1 in Matador pin with steel ring (`pin` param) | published |
| Spine 2×3 in, crossbar 21 × 2 × 3 in, gusset, flange depth 3.25 in | — | estimated (photo 07 scaled to 27 in) |

The laser-cut "R" in the gusset is omitted (logo).

## REP Fitness Dip Station (`rep-dip-station`, 32)

Sources: [dip-station](https://repfitness.com/products/dip-station) and its product JSON.

Photos: 8 plus review photos. The best comparisons are 07 (studio), 06 (installed) and review 14 (elevation). It is a
rack attachment, not free-standing. The 1000-series L-bracket design is out of scope.

| Dimension | Value | Basis |
|---|---|---|
| L × W × H | 32.1 × 27 (max) × 11.3 in | published |
| Capacity / steel | 400 lb, 4 and 11 gauge | published |
| Series | 4000 5/8 in (PRA-4200), 5000 1 in (PRA-5202) | published |
| Peg + lock pin | peg at the target hole, red pull pin `round(190 mm / pitch)` stations lower (4 on 2 in) | estimated |
| Arm 2 × 3 in to 276 mm, sleeve collar with two bolts, 21 in crossbar at arm height, 44.5 mm handles 19 → 25 in c-c | — | estimated from photos (no drawing) |

White "REP" gusset lettering is a flat colour panel.

## REP Fitness Drop-In Dip Attachment (`rep-drop-in-dip-attachment`, 28)

Sources: [drop-in-dip-attachment](https://repfitness.com/products/drop-in-dip-attachment), the product JSON, and the
official dimension drawing `acf.PRA-X210---Dims.png`.

Photos: 13 plus 16 review photos. The best comparisons are 01 (pair), 09 (drawing) and 03 (installed).

| Dimension | Value | Basis |
|---|---|---|
| Height / width per side / depth added | 12.2 / 15.7 / 16.5 in | published |
| Handles | 44 mm, 14 in usable, 18.3 → 24 in apart (≈11.8° cant) | published / derived |
| Weight / capacity | 18.2 lb per side, 810 lb | published |
| Double C-cup (2 × 76 mm), J-cup peg, 2 × 2 in arm with vertical and horizontal bolts, mountain cut-out | — | estimated from the drawing and photos |

- It mounts on the front (or back) face as a **handed pair**. The first unit reaches toward local −X; the second is
  mirrored.
- The REP lettering is omitted (logo). The mountain outline is cut as a plain shape.

## Bells of Steel Y Dip Bar (`bells-of-steel-y-dip-bar`, 27)

Sources:
- [y-dip-bar-attachment](https://www.bellsofsteel.us/products/y-dip-bar-attachment) (US and CA JSON)
- DIP-RA manual

Photos: 13 plus 18 review photos. The best comparisons are 01, 07 and 11.

| Dimension | Value | Basis |
|---|---|---|
| Handles | 1.9 in (48 mm), 16.25 in usable | published |
| L × W | 25 × 27 in | published |
| Capacity | 440 lb (60 mm) / 500 lb | published |
| DIP-RA hardware | 2 × M12 × 75 bolts, 16 mm pull pin, 3 × 60 R-clip | published (manual) |
| Versions | DIP-RA 2.3 in / 5/8 in; YDIP-RA-HDR Hydra 3x3 / 5/8 in (bolt-together L-arms, saddle); DB-RA-MTC Manticore 3x3 / 1 in (welded T, UHMW liners) | published |
| Cup plates, peg-to-pin 2 stations, spine, stubs, crossbar 21.5 in, splay 6° / 16° | — | estimated |

- It is placed on the inside face, as BOS asks for racks that are not bolted down.
- `validate` refuses the 60 mm version on 3 in posts, and the 3x3 versions on smaller posts.

## Fringe Sport The Swan Neck (`fringe-sport-the-swan-neck`, 25)

Source: [the-swan-neck](https://www.fringesport.com/products/the-swan-neck) (10 photos).

The issue lists it among the landmine handles, but it is a rack-mounted swivel mount and vertical storage hook for the
Fringe belt squat / lever arm, so it ships as a rack part.

| Dimension | Value | Basis |
|---|---|---|
| Size | 380 × 280 × 150 mm | published; read as height × reach × width, which matches the photo proportions (box about 2.4:1, bolts about 1.85 box heights apart, so four 2 in stations) |
| Mounting / fit | M24 bolts, not for 5/8 in racks, optional 5/8 in magpin | published |
| Weight / finish | 11.5 lb net, matte black | published |
| Hinge leaves, 2 × 3 swivel box with pin hole, 2 × 2 post, slotted hook tab, red pop pin | — | estimated from photos |

## Rogue Monster Landmine 2.0 (`rogue-monster-landmine-2`, 77)

Source: [RA1671](https://www.roguefitness.com/rogue-monster-landmine-2-0) (12 photos: TH, H, web1–11).

- Published:
  - 11.56 lb
  - 2 in ID × 10 in DOM sleeve
  - 1 in axle with the Monster knurled knob
  - machined aluminium joint and bronze bushings
  - finishes: Cerakote joint, MG Black sleeve, matte black knob, spacer, collar and axle
  - 3x3 Monster only
- Estimated: the octagonal joint block (70 mm across flats), knurled spacer (44 × 38 mm), clevis and tongue, collar, and
  the 2.5 in sleeve OD.

## Rogue Landmine, Infinity / Monster Lite (`rogue-landmine`, "Rogue Landmines" 47)

- **Sources:** [roguefitness.com/landmines](https://www.roguefitness.com/landmines) (RA0017 single / RA0018 double), the
  RA0017 manual, and 8 photos.
- **Published:**
  - 10 in 7-gauge sleeve, 8 lb, 315 lb
  - 5/8 in hardware:
    - 2x3 Infinity: 5/8 × 6 in hex bolt and nut
    - 3x3 Monster Lite: T-handle band peg and 11/16 in shaft collar
  - installed on the outside face
- **Estimated:** clevis tongues, yoke, hinge bolt, sleeve OD, and the white ROGUE print, shown as a flat panel.
- **Not modelled:** the double set.

## Bells of Steel Landmine Rack Attachment (`bells-of-steel-landmine-rack-attachment`, 32)

Source: [landmine-power-rack-attachment](https://www.bellsofsteel.us/products/landmine-power-rack-attachment) (16 photos).

- Published:
  - 315 lb
  - UHMW-lined sleeve
  - star-knob bar lock
  - 5/8 in version for tubes up to 3 in
  - Manticore 2.0 version with a 1 in mag pin, UHMW rack protection and two-axis rotation
- Estimated: the 11 in × 2.5 in sleeve, the U bracket and T pin, and the channel bracket, hinge barrel and swivel U.
- Known simplification: the Manticore mag pin crosses the post through the side holes, while the mount check uses the
  normal pin axis (`pinAxis` is per entry, not per param). The bore check is the same.

## REP Fitness Landmine (`rep-landmine`, 29)

Source: [power-rack-landmine-attachment](https://repfitness.com/products/power-rack-landmine-attachment) (4 photos:
PRA-4300 / PRA-5300).

- REP publishes no dimensions. The Adroit FAQ says it is steel, connects with a band-peg-style pin, and has no 360°
  articulation.
- Everything else is estimated from the photos:
  - bent-strap bracket on a long chrome T-handle pin
  - hinge ears with a bolt
  - 11 in × 2.5 in sleeve with a seam band

## REP x Kleva Built Adroit Landmine (`rep-kleva-adroit-landmine`, 77) and Kleva Built Adroit Landmine 2.0 (`kleva-adroit-landmine-2`, 54)

Sources:
- [REP LM-KB-2000](https://repfitness.com/products/rep-x-kleva-built-adroit-landmine) (23 photos)
- [Kleva Adroit 2.0](https://klevabuilt.com/products/adroit-landmine-2-0) (7 photos)

| Dimension | Value | Basis |
|---|---|---|
| Rack-mounted height / tube / extension | 11.75 / 6.9 / 3.5 in | published (REP tech specs) |
| Tube / weight | 2 in, 3.56 lb | published |
| Holes | 5/8 in stud with a removable 1 in adapter sleeve (`hardware`) | published |
| Materials | acetal hand nut, magnetic storage mount, polycarbonate liner, anodized aluminium, spherical and thrust bearings | published |
| Magnet puck | on its own hole `round(220 mm / pitch)` stations up | estimated so the stowed sleeve rests on it |
| Ball joint, clevis, stem, six window slots | — | estimated from photos |

- **REP version:** a star knob on the clevis bolt. The magnet is always included.
- **Kleva 2.0:** a hex bolt and spring, and the magnet is optional (`magnet` param).

## Not shipped (follow-up)

- **Rogue Post Landmine (36):** a floor landmine. Its post drops into stacked bumpers, an Echo sled or a Butcher (RA0025
  manual). It needs a floor family, not a rack part.
- **Landmine handles:** Titan Viking Press Landmine Handle (52), Rogue Parallel Landmine Handle (40) and Titan Straight
  Landmine Handles (25). They slide onto the barbell's sleeve, not the landmine or the rack, so they cannot be rack parts
  and need a floor or hang family with registry wiring.
- **Bullet Proof ISO Handles (25):** Gym Radar lists these as isolateral handles that swap into the barbell latch of the
  Bullet Proof VTS Smith machine. They are a Smith attachment, not a rack or landmine part.
