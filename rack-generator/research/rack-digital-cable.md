# VOLTRA accessories & rack-mounted cable systems (#136)

Rack parts in `rack-parts/rack-digital-cable.ts` (metadata) and `parts/rack-digital-cable*.ts` (builders), section
"Digital & cable". Sources checked 2026-09-19. Popularity from Gym Radar. Every VOLTRA-carrying mount re-uses the
built-in VOLTRA I device and dock from `parts/voltra.ts` unchanged (323 × 139 × 100 mm published envelope, see
`docs/vendor/voltra.md`): the builders call the built-in `voltra-adaptive` build, keep its dock and device solids, move
the dock centre to the origin and place them. The Rotator re-uses the built-in `voltra-sliding` collar, pin and dock.

Frame: origin on the upright centreline at the target hole, +Y out of the mounting face, X across it, Z up
(`rack-part.ts`). Tests: `rack-digital-cable.test.ts` (published dimensions, fit rules on real profiles, 3MF credits) plus
the registry sweeps.

## Darko Lifting QuickMount Bracket for VOLTRA I (125) · `darko-quickmount-voltra`

Sources: [darkolifting.com QuickMount](https://darkolifting.com/products/quickmount-bracket-for-voltra) and its
`products.json` (8 images: gloss black U-bracket with the Beyond Power dock cup, inside view with the printed liner and
dock bolts, flange keyhole, on a Rogue Monster upright with the knurled Magpin knob, with the VOLTRA horizontal and
vertical, handle version), the 1 in hole only black and stainless pages (2 images), QuickMount PM (3 images: pulley tab,
installed with a snatch block), QuickMount Handle (2 images), and the [Gym Radar item](https://gymradar.com/equipment/quickmount-bracket-for-voltra-i)
(4 owner photos: on a 3x3 upright, on a crossmember with the VOLTRA underneath, in a garage rack).

Published: 1/4 in steel, lined with 3D-printed plastic; for 1 in and 5/8 in racks (standard) or 1 in only (black or
stainless; stainless is not magnetic); needs the Beyond Power VOLTRA I dock and a 0.98 in Magpin; optional bent-steel
handle (knurled grip, 14 colours); PM adds a pulley point for a 1:2 snatch-block setup, same footprint.

| Dimension | Value | Basis |
|---|---|---|
| Steel | 6.35 mm (1/4 in) | published |
| Magpin | 24.9 mm (0.98 in), knurled aluminium knob Ø38 × 28 | published pin; knob estimated |
| Bracket | U over the post: web on the face, flanges down both side faces to 6 mm short of the rear face | photos |
| Height | 127 mm (5 in) | estimated from the upright holes in the installed photos |
| Liner | 3 mm printed plastic on the three contact faces | estimated |
| Keyhole | Ø26.5 lobe (1 in) 14 mm above a Ø17 lobe (5/8 in) | estimated; the bracket rides 14 mm higher on a 5/8 in pin |
| Dock cup | chrome Ø84 × 26 mm on the web | estimated |
| Handle | 4.8 mm plate under the dock, 45° bend, 104 × 96 mm loop, 112 × 26 × 22 mm grip | estimated |
| PM tab | 52 mm wide, 58 mm above the web with a Ø22 pulley hole | estimated |

Modelling: the Magpin runs side to side through both flanges and the post (`pinAxis: 'across'`, main stations only).
`version` covers the four brackets (keyhole black, 1 in only black / stainless, PM), `pin` the 0.98 in Magpin or a 5/8 in
pin (keyhole brackets only), `handle`, and the VOLTRA quarter turns as on the built-in mounts. `autoFit` picks the 5/8 in
pin on 5/8 in racks; the 1 in only brackets refuse them by bore. Validation: 3 x 3 in posts only (Darko sells it for
3 x 3 racks). Not modelled: the owner-photo use on a crossmember with the VOLTRA underneath (the rack-part registry
targets upright holes; a crossmember-underside frame would need a new target kind).

## Beyond Power VOLTRA Strap Mount (39) · `beyond-power-voltra-strap-mount`

Sources: [beyond-power.com/products/strap-mount](https://www.beyond-power.com/products/strap-mount) (5 images: product
render, on a tree, on a pillar, in a basement, real photo on a round post) and the
[Gym Radar item](https://gymradar.com/equipment/voltra-strap-mount) (5: render, on a Rogue 3x3 upright, on a red 3x3
upright, on a pegboard, stored).

Published: polyester strap in 0.5 m and 1 m lengths, magnetic backplate, aluminium and titanium, plasma polished,
dual-lock dock; posts from Ø80 mm round or 70 × 70 mm square; package 280 × 199 × 146 mm.

| Dimension | Value | Basis |
|---|---|---|
| Dock plate | 120 × 130 × 22 mm, r14 corners | estimated from the 3x3 owner photos |
| D-loop handle | 80 × 120 mm frame, 46 × 88 mm opening, on the -X side | estimated |
| Strap | 50 × 2.5 mm, 1.5 mm off the post, closing in a 56 × 14 × 60 mm cam buckle behind it | estimated |
| Excess strap | rolled beside the buckle: the roll grows with the 1 m strap | derived from the strap length |

Validation: posts at least 70 mm across (so 2 x 2 racks such as the Titan T-2 refuse it). No rack pin (`pin: 0`): the
strap wraps the post at any hole height.

## Beyond Power Adaptive VOLTRA Bar Mount (69) · `beyond-power-adaptive-bar-mount`

Sources: [beyond-power.com/products/adaptive-bar-mount](https://www.beyond-power.com/products/adaptive-bar-mount)
(7 images: product render, on a bar, with a TRX strap, hand for scale, the 16 mm / 51 mm dimension drawing, clamped on a
rack peg on an upright, on a storage horn) and the [Gym Radar item](https://gymradar.com/equipment/adaptive-voltra-bar-mount)
(4: render, on a rack's top crossmember, a pair on a barbell, in hand).

Published: 245 × 103 × 97 mm, 1.88 kg, 16–51 mm (0.6–2 in) bars, aluminium, stainless, nylon and rubber, tool-free knob,
one-handed quick release, dual lock; drawing: 127 mm knob top to the 16 mm jaw, 88 mm knob top to a 2 in bar.

| Dimension | Value | Basis |
|---|---|---|
| Body | 94 mm wide, 70 mm along the bar, roof chamfer 25 mm | drawing proportions |
| Jaw window | 52 mm wide, 58 mm tall with nylon jaws | drawing |
| Knob | Ø62 × 49 mm, fluted | drawing |
| Dock flange | 105 × 97 × 12 mm (published 103 mm W with the side bolts) | published / drawing |
| Knob top to dock face | 168 mm | drawing scale |

Rack use: the clamp holds a 1 in peg in an upright hole, as in Beyond Power's own gallery. The peg follows the Rogue
Monster Band Peg 2.0 (1 in rod, 7-3/8 in proud, 5/8 in cap) and is labelled as sold separately; the clamp sits 120 mm
out. `dock` hangs the VOLTRA under the peg (cable down, across-face turns only, so it clears the upright) or sideways.
The 1 in peg needs 1 in holes (bore check).

## Beyond Power Fixed VOLTRA Bar Mount (26) · `beyond-power-fixed-bar-mount`

Sources: [beyond-power.com/products/bar-mount](https://www.beyond-power.com/products/bar-mount) (6 images: renders,
on a rack's pull-up bar, with the VOLTRA, owner photo, the 1 in / 2 in spacer drawing) and
[Fixed Bar Mount Spacer](https://www.beyond-power.com/products/fixed-bar-mount-spacer) (2 images of the spacer shells,
screws and T-key).

Published: 1–2 in (25.4–50.8 mm) bars, aluminium alloy, package 239 × 161 × 126 mm. Estimated: 110 × 125 mm block, split
10 mm above the bore, 42 mm cap with 18 mm chamfers and four cap screws, Ø88 chrome dock cup, dark / mid grey anodising.
The 1 in spacer shells are fitted because it rides the same 1 in rack peg as the Adaptive mount.

## Beyond Power Rotator VOLTRA Add-on (30) · `beyond-power-voltra-rotator`

Sources: [beyond-power.com/products/rotator-add-on](https://www.beyond-power.com/products/rotator-add-on) (8 renders:
front, side, top, back, on an upright with the sliding mount at level, down-angled and vertical VOLTRA).

Published: mounts over any AnyMount, 120° rotation that follows the cable, aerospace aluminium and hardened steel,
dual lock, 20,000-rotation test, package 203 × 171 × 164 mm. Estimated: 112 mm square base plate that seats in the
AnyMount dock with a copper release latch, a black yoke (arms at ±50 mm) and a grey head that pitches about the yoke's
X axis 72 mm in front of the dock, its own dock 116 mm out. `angle` poses the head at 0, ±30 and ±60°. Shown on the
Sliding Rack Mount (built-in `voltra-sliding` geometry, transverse pin, 3 x 3 only), the base in Beyond Power's renders.

## Bullet Proof Fitness VTS Rack Attachment (56) · `bulletproof-vts`

Sources: [bulletprooffitnessequipment.com VTS Rack Attachment/Pair](https://bulletprooffitnessequipment.com/products/vts-rack-attachment-pair-1)
(12 images including the side and top dimension drawings, installed on an upright with a barbell and plate, the latch
hooks, the pin/hole latch variants and a rack with cable pulleys).

Published (drawings): 6.7 in (170.2 mm) body width, 8.78 in (223 mm) body and 10.57 in (268.5 mm) to the top eye,
9.13 in (231.9 mm) with the hex ports, 12.3 in (312.4 mm) overall depth, 15.25 in (387.4 mm) weight horn, 27 in
(685.8 mm) overall with the horn; eight UHMW rollers on bearings; two latch hooks per pair; 3x3, 2x3 and 2x2 versions.

| Dimension | Value | Basis |
|---|---|---|
| Frame | two chamfered side plates, front/back and end plates, 8 mm | estimated |
| Rollers | 8 × Ø32 × 50 mm, two per post face above and below the centre | count published, size estimated |
| Barbell clamp | twin U-seat jaws 172 mm ahead of the post, bar sleeve, two toggle clamps | estimated from renders |
| Latch hook | aluminium strap from the clamp to a 5/8 in tip in the hole above the trolley | estimated |
| Horn socket | 66.5 mm (27 in − body − ports − horn) | derived |
| 9 in horn | 3 in shorter sleeve than the 12 in | estimated |

Frame choice: the mounting face is the side face the latch hooks into (the rack's outer side), the barbell runs along
local Y past the front of the post, hex ports on the inner plate, the horn socket on the outer plate. Sold as a pair,
so `pair.default` and `handed` (the second unit mirrors). `post` covers the 3x3 and 2x2 pairs, validated against the
rack tube (`autoFit` picks 2x2 on 2 x 2 racks). The 2x3 pair is not offered: rack-part builders only receive the face
width, so a 2x3 post's depth is unknown to the geometry.

## Bullet Proof Fitness ISOLATOR 3x3 (39) · `bulletproof-isolator-3x3`

Sources: [bulletprooffitnessequipment.com ISOLATOR 3x3](https://bulletprooffitnessequipment.com/products/isolator-3x3_)
(4 renders: black/black, black/red, white/black, white/red), the ISOLATOR Side Port Weight Arm page (7 renders of the
Isolator on a rack from four angles), ISOLATOR Cam (19 renders and diagrams on a rack), Removable Rear Carriage, Seat/Pad,
Long Pad, Curl Arm and Seat Spotter pages.

Published: base unit = carriage that attaches to the rig post, weight holder and two universal pins (1/2, 5/8, 3/4 or
1 in; 1 in carriage bore with reducer plates); includes the preacher pad/seat, long leg pad and curl arm; black or white
frame; pads in black or red vinyl; 360° pull-pin seat adjustment; removable rear carriage per post size.

| Dimension | Value | Basis |
|---|---|---|
| Carriage | 7 mm sleeve around the post, 205 mm tall; 110 × 78 × 190 mm bearing block | estimated vs the 3 in upright |
| Pins | two, two stations apart (`holes: [0, -2]`) | two published, spacing estimated |
| Shaft | Ø38 hex, 400 mm, 58 mm off the face | estimated |
| Dial | Ø124 × 10 mm with 12 pull-pin holes | estimated |
| Pad arm | 2 x 2 in, 360 mm, tilted 18° | estimated |
| Seat / preacher pad | 400 × 250 × 62 mm | estimated |
| Long leg pad | Ø90 × 260 mm | estimated |
| Weight arm / horn | 2 x 2 in × 330 mm; Ø50 × 250 mm horn | estimated |

Params: frame colour, pad colour, pad side (mirrors the lever) and pin size (autoFit by bore). Validation: 3 x 3 posts.

## Not shipped

Update (2026-09-20): the REP lat pulldowns have since shipped as registry v2 rack parts. See [rack-digital-cable-trainers.md](rack-digital-cable-trainers.md).

- **Beyond Power Travel VOLTRA Platform (58):** a 700 × 390 × 22 mm maple floor board (13.6 lb) the VOLTRA docks onto for
  deadlifts and curls; it is a floor item, not a rack attachment, so it belongs with the floor families.
- **REP Selectorized Lat Pulldown & Low Row (4000/5000) (33)** and the **plate-loaded rack lat / low row (REP
  PR-4700/5702 or Bells of Steel Hydra/Manticore):** researched (REP: 200 lb stack upgradeable to 300, 1:1, 48/60 in
  travel, added height 3.3 in, depth 8.5/27.5/19.5 in, needs the new top member and the Rear Base Stabilizer, 80 or
  93 in attachment to match the rack; BoS: 72/84/90 in, 30 in depth, 4.5 in height, needs a 43 in rear crossmember with
  top holes). Both are floor-standing machines that span the rack width, replace a top member and anchor to the rack
  base. A rack-part builder only receives the tube, pitch and bore, not the rack width, height or floor, and a part
  mounts at one hole or rail station, so neither can be placed faithfully as a rack attachment. They fit the rack
  system layer (`parts/cable-systems.ts`, like ARES and Athena), which is outside this family's files.
