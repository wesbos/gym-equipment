# Adjustable dumbbells and their stands (issue #111)

Family slug `adjustable-dumbbells`. Checked 2026-09-19; popularity from Gym Radar (Sep 2026). Every entry was compared against 8+ reference photos (manufacturer galleries, retailer listings, owner's manuals and review sites) over at least two render rounds. Values marked as estimates are reconstructed from photo proportions or solved from published lengths, not manufacturer CAD.

Shared conventions: build axes X along the dumbbell, Y across, Z up; the builder turns the part a quarter turn so pairs sit side by side along floor X (`parts/adjustable-dumbbells-kit.ts`). Cradle dumbbells default to a lifted pose where the handle and selected plates ride 80 mm (as `POWERBLOCK_LIFT`) above the cradle and the unselected plates stay seated; the racked pose seats everything. Plate-loaded dumbbells (IronMaster, Eisenlink, Kensui) carry only the loaded plates, so their length and footprint change with weight.

## IronMaster Quick-Lock dumbbell (`ironmaster-quick-lock-dumbbell`) and stand (`ironmaster-quick-lock-stand`)

Sources checked 2026-09-19:
- [IronMaster Quick-Lock 75 lb set](https://www.ironmaster.com/products/quick-lock-adjustable-dumbbells-75-original/) and [45 lb set](https://www.ironmaster.com/products/quick-lock-dumbbell-system-45-lb-set-original/)
- [120 lb add-on kit](https://www.ironmaster.com/products/add-on-kit-to-120-lbs-quick-lock-original/), [165 lb add-on kit](https://www.ironmaster.com/products/165-lb-add-on-kit-custom/), [Heavy Handle Plate Kit](https://www.ironmaster.com/products/heavy-handle-plate-kit/)
- [Stand for Quick-Lock Adjustable Dumbbells, SKU 1008](https://www.ironmaster.com/products/stand-for-quick-lock-adjustable-dumbbells/) (Gym Radar's "Stand for Quick-Lock Adjustable Dumbbells"; the PRO carts are other products)
- [Quick-Lock operating instructions PDF](https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/09/Quick-Lock-Dumbbells-6-16.pdf), [stand assembly sheet rev C](https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/09/Dumbbell_Rack-revC.pdf)
- [Owner measurements (stand top lip and overhang)](https://hildstrom.com/projects/2020/11/ironmaster/index.html), [Garage Gym Reviews](https://www.garagegymreviews.com/ironmaster-adjustable-dumbbells-review) photos
- 40+ photos reviewed: manufacturer gallery (75/120/165, Heavy Handle, stand), IronMaster UK 165 spec graphic, GGR close-ups of plate faces, screw heads, backing plates and the stand.

### Dumbbell
No cradle or selector: a chrome handle (5 lb) with a square chrome backing plate welded at each end, square cast-iron plates that slide on from the ends, and a Quick-Lock screw (2.5 lb, 4" knurled disc head) at each end. Loaded length grows with weight.

| Published | Value | Model |
|---|---|---|
| Plate | 6.7" square | 170 mm, 23 mm corner radius (est) |
| Grip | 1.25" chrome, diamond-peak knurl; 6.5" between backing plates | Ø31.75, 165 mm; knurl shown as 0.8 mm raised rings at 2.2 mm pitch |
| Grip with Heavy Handle kit | 5.18" | 132 mm (16.5 mm split plate inside each backing plate) |
| Length 20 / 75 / 120 lb | 9" / 14.5" / 18.25" | 229 / 368.2 / 464.2 mm |
| Length 165 lb | 23.5" | 560 mm (22.1") — see estimates |
| Weights | handle 5 lb, screw 2.5 lb, plates 2.5 / 5 / 22.5 lb, Heavy Handle +7.5 lb per end | same |
| Ranges | 5–45, 5–75 (29 settings), to 120, to 165 lb; Heavy Handle +15 lb (20 lb empty) | `kit` × `heavy` × `weight` |
| Screw head | 4" disc (owner: 103 mm) | Ø103, 12.4 mm proud |

Selector steps: 2.5 lb from the bare handle. 7.5 lb = one screw; from 10 lb both screws; each end then carries 22.5 lb blocks (innermost, only when the end load exceeds the 32.5 lb a standard end holds), 5 lb plates and at most one 2.5 lb plate under the screw. Odd 2.5 lb settings put one extra 2.5 lb plate on one end only — the manual's single-plate offset — so that end is one plate longer. Kit contents bound it: 3 × 5 lb per end (45 set), 6 per end (75 set), one 2.5 lb per end, 1 or 2 × 22.5 lb per end with the add-on kits.

Estimates: plate pitch 11.6 mm for both 5 and 2.5 lb plates, 48 mm per 22.5 lb block, and 8 mm backing plate + 12.4 mm screw head are solved from the 9"/14.5"/18.25" lengths (5 lb plate volume check ≈ 5.3 lb; 22.5 lb block ≈ 21.8 lb). The published 165 lb length (23.5") would need a 2.6" second block, inconsistent with the 120 lb figure; the model keeps 48 mm blocks and is 22.1" at 165 lb. Plate taper (162 mm inboard face growing to 170 mm), outer-face relief (raised border, 1.5 mm recessed field, Ø81 boss, Ø27 bore; 2.4 mm field on the 2.5 lb plate), backing-plate dish, rim lip and top V notch, brass-tone bushing, screw-head knurl band and etched OPEN arrow / LOCK arc are photo estimates; raised plate lettering and logos are not modelled. Heavy Handle plates are split horizontally through the grip axis with two top socket bolts.

Colours: plates satin black #1d1e20 (roughness .75); handle, backing plates and screws bright chrome #d9dcdf / #d4d7da; knurl #b9bdc1; bushing #b89b62; Heavy Handle plates #1f2022 with black-oxide bolts.

### Stand (SKU 1008)
| Published | Value | Model |
|---|---|---|
| Top | 14.5" × 19" (assembly sheet 14" × 19"), rubber covered | 368.3 × 482.6 mm; 2.1 mm sheet (owner-measured) + 2.8 mm mat, top of mat at 26" |
| Height | 26" | 660.4 mm |
| End panels | 12.5" × 25" | 317.5 wide, 19–653 mm, 23 mm inward flanges (est) |
| Shelves | 2 × 12 3/8" × 16 7/8", rubber covered | 314 × 429 mm at 64 mm and 495 mm (heights est) with 38 mm lip bands on the open sides |
| Top lips | 15 mm inside / 19.5 mm outside, 21 mm overhang past each panel (owner-measured) | along both 14.5" ends |
| Separator, feet | separator above the upper shelf; 4 rubber levelling feet | 127 mm separator at mid-depth; Ø38 × 19 mm feet (est) |

The dumbbells lie lengthwise along the 19" top, side by side (`load`: empty, pair of 45s, 75s or 120s). A 165 lb pair (22.1"+) is longer than the top, so it is not offered. Colours: dark grey metallic #3c3e41, black diamond-texture rubber #151515, white IRONMASTER badge plate on each end panel (no logo artwork), chrome button-head bolts.

## NÜOBELL 550 / 580 (`nuobell-adjustable-dumbbell`)

Sources checked 2026-09-19:
- [NÜO Athletics NÜOBELL 580](https://nuoathletics.com/products/nuobell-580) and [NÜOBELL 550](https://nuoathletics.com/products/nuobell-550) spec lines and galleries
- [SMRTFT NÜOBELL 80 lb](https://smrtft.com/products/nuobell-80lb) (US distributor: knurled 32 mm handle, aluminium V-connectors, two portable cradles)
- [BarBend review](https://barbend.com/nuobell-dumbbells-review/) (19 × 8 in stored footprint, twist toward +/−) and [ShreddedDad review](https://shreddeddad.com/nuobell-adjustable-dumbbells/) (inner rod picks up the selected discs; length grows with weight)
- [Bells of Steel colourway gallery](https://bellsofsteel.us/products/nuobell-adjustable-dumbbells)

Published dimensions: NB580 485 × 193 × 185 mm, NB550 395 × 193 × 185 mm; grip 105 mm × Ø32 mm knurled aluminium; 5–80 / 5–50 lb in 5 lb steps (16 / 10 settings).

Derived: 2.5 lb discs, 15 / 9 per side, at a 7.5 mm pitch ((485 − 395) / 2 / 6); 77.5 mm per side from grip end to the first disc (cone + hub + 30 mm head plate), which fits both published lengths. Discs are Ø193 with the bottom cut flat to 185 mm.

Mechanism as modelled: twisting the handle turns a notched rod that picks up discs from the inside out. Setting w carries (w − 5) / 5 discs per side; the rest, including the outer end disc with its tongue and centre screw, stay seated against the saddle. The default pose lifts the handset 80 mm (like the PowerBlock) so the selection reads; the racked pose seats everything.

Estimates: disc clearance above the floor 10 mm (195 mm height in the cradle); cradle saddles 20 mm thick with a 2 mm gap, 212 mm wide, 128 mm tall, ribbed outer pocket; floor rails Ø25 at ±80 mm; inner U-clips 92 mm tall; comb tab band 62 mm wide dropping 38/44 mm on alternating discs; hub Ø78 with a cone from Ø41; weight window 16 × 16 mm on the hub top. Colourway hexes (classic #2b2c2f, green #4b5a3c, red #b3242b, ash #c9cbcd, blue #2f9bd4, pink #e3a2b6, all-black) are photo estimates; hubs, comb tabs and cradle stay black. No wordmarks are embedded.

## MX Select EVO MX100 (`mx-select-evo-mx100`)

Sources checked 2026-09-19:
- [MX Select EVO MX100 knurled](https://mxselect.com/products/evo-mx100-knurled-dumbbells/) and [contoured](https://mxselect.com/products/evo-mx100-contoured-dumbbells/) product pages
- [Knurled brochure spec table](https://mxselect.com/wp-content/uploads/brochure/MX-SELECT-EVO-MX100-Knurled-Dumbbell-Brochure.pdf) and [contoured brochure](https://mxselect.com/wp-content/uploads/brochure/MX-SELECT-EVO-MX100-Contoured-Dumbbell-Brochure.pdf)
- Manufacturer dimension drawing (431 / 475 / 211 mm, 202 × 182 mm plate face) and weight-legend decal (lb and kg per dial number)

Published dimensions: 10–100 lb in 10 lb steps (dial 1–10); 10 × 5 lb (2.26 kg) plates per side; 243 mm handset, 432 mm at 100 lb; plates 202 W × 182 H mm; knurled grip 152 mm × Ø29 mm (contoured rubber ≈ Ø36); 475 mm long and 211 mm high in the cradle; pair footprint 475 × 415 mm.

Derived: plate pitch 9.45 mm ((432 − 243) / 2 / 10); handset head 45.5 mm per side ((243 − 152) / 2). The legend's kg column (5.9 kg at dial 1, +4.4 kg per number, 45.4 kg at dial 10) plus the 432 mm full length mean dial k carries k plates per side, so the "10 lb" setting already includes the innermost pair (bare handset ≈ 1.5 kg). Pair gap 1 mm reproduces the 415 mm pair footprint with two 207 mm cradles.

Estimates: plate foot 29 mm above the floor (211 − 182) and grip axis 96 mm above the plate foot (centre bore position on the drawing); top plate corner radius 48 mm, bottom 14 mm; stepped top notch shifting 10 mm per plate; handset head a Ø152 drum with flats at ±61 mm, four Ø17 inner-face recesses and a Ø16 release button at the front; dial a knurled Ø36 × 10 mm ring with a Ø29 white face, index line turning 36° per setting and a yellow pointer; cradle 207 mm wide with D-shaped 19.5 mm end walls (122 mm tall), 2.2 mm pocket walls 16 mm above the plate foot and a 12 mm centre deck carrying the 110 × 95 mm yellow-bordered legend decal. Decals are flat colour blocks, not artwork.

## Kensui AdaptaBELL PRO / MAX (`kensui-adaptabell`)

Sources checked 2026-09-19:
- [Kensui AdaptaBELL](https://kensui.com/products/adaptabell) product page and model comparison card
- [Garage Gym Reviews](https://www.garagegymreviews.com/kensui-adjustabells-review) (2.8" / 70 mm loadable per side, ACME-thread end caps) and [Gear Patrol](https://www.gearpatrol.com/fitness/a44850885/kensui-adjustabell-review/)

Published: PRO 9 cm peg, Ø34 mm grip, reinforced polymer, 70 kg per pair; MAX 10.75 cm peg, Ø38 mm grip, metal build with UHMW, 150 kg per pair; both take 28 mm standard and 50 mm Olympic plates with flat, overhang-free ends.

There is no selector or cradle: the user's own plates are the weight, clamped between the handle flange and a screw-in peg with a knurled end disc. The `load` param is plates per side in 2.5 lb steps, built from generic 1" cast-iron change plates (10 lb Ø229 × 22, 5 lb Ø200 × 16, 2.5 lb Ø158 × 13 mm, estimated catalogue sizes, heaviest innermost), limited to stacks that fit the loadable length (PRO up to 30 lb per side, MAX up to 35). The handle lies on the floor on its largest disc.

Estimates (scaled from product photos by the published grip diameter): PRO grip 135 mm, flange Ø68 × 9 mm with four Ø6 holes, end disc Ø75 × 10 mm, thread Ø26 mm, 32 mm of thread showing when empty; MAX grip 205 mm, flange Ø104 × 12 mm on a 16 mm conical fillet, end disc Ø106 × 15 mm, thread Ø27 mm (kept below the 28 mm plate bore), 20 mm showing when empty, 85 mm loadable. The photos disagree with the earlier ~146 mm MAX grip estimate; the modelled values come from the straight-on product renders.

## PowerBlock: Elite EXP, Sport EXP, PowerBlock EXP 90, Commercial Pro 90 (presets of `powerblock`)

Sources checked 2026-09-19:
- [PowerBlock Elite EXP product JSON](https://powerblock.com/en-de/products/elite-exp-adjustable-dumbbells.json): 7 gallery images (stage 1 pair, EXP 90 with new decals, micro weight, lifestyle on the column stand)
- [Rogue Elite EXP product guide](https://www.roguefitness.com/powerblock-series-elite-exp-dumbbells): stage lengths and weight chart
- [PowerBlock store catalogue](https://powerblock.com/products.json): Sport EXP plates (#1–#8 labelled 20–90), Sport EXP handle, PowerBlock EXP Stage 2/3 kits (black Sport EXP), Commercial Pro 90 plates (#1 black … #8 grey) and 5/10 lb handles
- [Top Fitness, Commercial Pro Series 90](https://www.topfitness.com/products/powerblock-commercial-pro-series-90): 17" × 7" × 7.25", 5–90 lb in 5 lb steps, 33 mm hard-chromed knurled grip, 4.88" straight grip, two 5 lb + two 10 lb handles
- Sport EXP: The Fitness Shoppe and Fitness Trading listings (12" × 6.5" × 6.5" stage 1; 16" × 6.5" × 6.5" at 90 lb)

| Preset | L × W × H (in) | Weights | Plates | Notes |
|---|---|---|---|---|
| Elite EXP Stage 1/2/3 | 12 / 14 / 16 × 6 × 6 | 5, 7.5, 10, 15 … 47.5, 50 (+55–70, +75–90) | 4 / 6 / 8 × 10 lb | 5 lb handle, two 2.5 lb chrome adders; rails black, white, purple, green, yellow, blue, red, grey (from the 20–90 decal chart) |
| Sport EXP Stage 1/2/3 | 12 / 14 / 16 × 6.5 × 6.5 | same chart | 4 / 6 / 8 | grey arched plates, grey rods with black number sleeves, black cage with red latch |
| PowerBlock EXP 90 | 16 × 6.5 × 6.5 | 5–90 in 2.5/5 | 8 | the black Sport EXP (Stage 2/3 kit photos are "Sport-EXP-Black"); red number sleeves |
| Commercial Pro 90 | 17 × 7 × 7.25 | 5–90 in 5 | 8 | urethane plates, oval end badges, coloured rod rings, 5 lb or 10 lb handle instead of adders |

Estimates: Stage 2 Sport EXP length (14") interpolated between the published 12" and 16"; cage lengths 212–230 mm chosen so each plate end is 11–13 mm, matching the photos; Elite EXP cage heads grey #7c7e81 with black rubber top tubes, grip Ø33 smooth black; PowerBlock EXP sleeves #b3262d. Gym Radar's "PowerBlock EXP 90" is read as the black PowerBlock EXP at Stage 3 (5–90 lb).

## PowerBlock Large Column Stand (`powerblock-column-stand`)

Sources: [powerblock.com/products/column-stand](https://powerblock.com/products/column-stand) (+ `.json`, 3 images incl. the 22" × 18" × 28" dimension graphic), [Fitness Exchange](https://fitnessexchange.com/products/powerblock-column-stand) (2 images: black column version), [Amazon B000XEAUBM](https://www.amazon.com/dp/B000XEAUBM) (4 images: silver version, tray close-up, lifestyle), Rogue listing ("uniquely angled", adhesive tray mat, circular adder holders, made in USA).

Published: 18" L × 22" W × 28" H, holds PowerBlock pairs up to 90 lb, circular micro-weight holders, adhesive tray mat, silver or black column.

Estimates: black moulded base 22" × 18" × 1.5", r 40 mm; column 8" × 5.5" sheet steel; tray 22" × 16" at 8° (front lip 1.5" low at the front, back and sides turned down); centre channel 3" wide × 2" tall with four Ø46 mm holders; silver #b8bbbe, black column #151618, badge black-on-silver or red-on-black. The 8° tilt is the steepest that keeps a 16.25" Elite USA 90 inside the published 18" depth; the photos suggest 8–12°. Loads: any PowerBlock pair up to 90 lb and 16.25" long (not the Pro 100 EXP or the 17" Commercial Pro 90).

## PowerBlock Large Compact Stand (`powerblock-large-compact-stand`)

Sources: [powerblock.com/products/compact-stand](https://powerblock.com/products/compact-stand) (+ `.json`, 4 images incl. the 18" × 17" × 26" dimension graphic), [Living.Fit](https://www.living.fit/products/large-compact), [Select Fitness](https://selectfitness.com/products/powerblock-large-compact-stand) (2), [Recovery for Athletes](https://www.recoveryforathletes.com/products/powerblock-large-compact-dumbbell-stand) (2).

Published: 18" W × 17" D × 26" H unfolded, 2" folded, centre channel for micro weights, fold-out legs with rubber feet, fits all PowerBlocks up to 90 lb.

Estimates: tray 18" × 15" with 1" lips on the left/right edges and grip mats; channel 2.5" × 1.5" with four holders; two scissor frames of Ø25 mm tube with a knee kink under the tray, pivot bolts at the crossing, low front-to-back tie bars; black #18191b. The 17" Commercial Pro 90 overhangs the 17" leg spread by 2 mm, so the footprint grows to the dumbbell length for that load.

## Bowflex SelectTech 552 and 1090 (`bowflex-selecttech-552`, `bowflex-selecttech-1090`)

Sources checked 2026-09-19:
- [BD552 owner's manual](https://download.bowflex.com/supportdocs/OM/Bowflex/BFX.BD552.OM.EN.pdf): envelope, weight settings, plate list C1–C5
- [BD1090 owner's manual](https://download.bowflex.com/supportdocs/OM/Bowflex/BFX.BD1090.OM.EN.pdf): envelope, weight settings, plate list C1–C5
- [Bowflex Results Series 552](https://www.bowflex.com/products/bowflex-results-series-552-selecttech-dumbbells) and [1090](https://www.bowflex.com/products/bowflex-results-series-1090-selecttech-dumbbells) product galleries (`.json` image lists): front, end, 3/4, handle-only, dial close-ups
- [Garage Gym Reviews 552 review](https://www.garagegymreviews.com/bowflex-selecttech-552-adjustable-dumbbells-review) and [1090 review](https://www.garagegymreviews.com/bowflex-1090-review): classic red colourway photos (red top bar and Y bracket, red oval cap logo, red-numeral 1090 dial)
- 35 photos reviewed (18 for the 552, 17 for the 1090), incl. orthographic front (b2, c3) and end (b3, c4) elevations used for proportions.

Published dimensions (manual), dumbbell racked in its tray:

| | 552 | 1090 |
|---|---|---|
| L × W × H | 16.9 × 8.3 × 9 in → 430 × 212 × 228 mm | 17.5 × 9.5 × 10 in → 444 × 242 × 253 mm |
| Settings | 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 52.5 lb (15) | 10–90 lb in 5 lb steps (17) |
| Handle alone | 5 lb | 10 lb |
| Plates per side (manual C5…C1, innermost first) | 7.5, 7.5, 5, 2.5, 1.25 lb | 15, 10, 7.5, 5, 2.5 lb |

Retail listings give 15.75 × 8 × 9 in for the 552; the manual figure is used. The model is built to the manual envelope exactly: tray length = L, innermost plate width = W, lobe tops = H.

Estimates (from the orthographic product photos, scaled to the published envelope):
- Plate thickness inner→outer: 552 21/21/19/19/14 mm, 1090 30/25/22/20/16 mm; 1.5 mm gaps; inner handle plate 20 mm (552) / 16 mm (1090).
- Lobe height above the handle axis, inner→outer (the stack tapers toward the dial): 552 99/98/92/81/70 mm, 1090 112/110/98/85/74 mm; handle plate 90 / 92 mm. Handle axis 129 mm (552) / 141 mm (1090) above the floor. Plate half-width = height × a common aspect solved so the innermost plate spans W.
- Plate outline: half-ellipse top, lower half reaching the tray well floor (20 / 22 mm); top slot 44 / 48 mm wide down to the axis (U-slot open at the top). 552 rim rounded (64-segment outline, 4 mm bevel); 1090 faceted (16-segment outline, 7 mm chamfer).
- Grip: 552 black rubber barrel Ø33–36 × 120 mm with chrome ferrules; 1090 knurled chrome Ø32 × 113 mm.
- Dials: Ø95 × 22 mm (552), Ø102 × 24 mm (1090); one raised pocket per setting with a numeral chip (white, or red on the classic 1090), turned so the selected setting reads under the nameplate pointer; cap Ø0.58 d with a light ring and oval logo; red selector ring under the classic 1090 dial.
- Top bar: in the plate slot from the inner handle plate to the dial, top at axis + 0.7 × inner lobe height, with a nameplate tab over the dial. Classic 552: red bar and red Y bracket; Results Series and 1090: grey bar, silver bracket (classic 1090 bracket red).
- Tray: 206 / 236 mm wide, 70 / 76 mm tall, rounded ends, two plate wells, arched underside along the front (≈0.76 L span, 24 mm rise) and a tunnel along the length (corner feet), raised saddles under the dials, SelectTech label strip on the centre plateau and a wordmark plate on the front face (flat, no logo artwork).
- Colours: plates #2a2b2d (classic 552), #35373a (classic 1090, visibly greyer), #1c1d1f / #1d1e20 (Results Series); tray #1b1c1e; red accents #d0202a; grey bar #8d9095.

Cam tables (plates carried per side; the manuals publish only the plate list, so the dial-to-plate mapping is estimated as the innermost-first subset that sums to (setting − handle) / 2; tests verify every sum):
- 552: 5 {} · 7.5 {1.25} · 10 {2.5} · 12.5 {2.5, 1.25} · 15 {5} · 17.5 {5, 1.25} · 20 {5, 2.5} · 22.5 {5, 2.5, 1.25} · 25 {7.5ᵢ, 2.5} · 30 {7.5ᵢ, 5} · 35 {7.5, 7.5} · 40 {7.5, 7.5, 2.5} · 45 {7.5, 7.5, 5} · 50 {7.5, 7.5, 5, 2.5} · 52.5 all
- 1090: 10 {} · 15 {2.5} · 20 {5} · 25 {7.5} · 30 {10} · 35 {10, 2.5} · 40 {15} · 45 {15, 2.5} · 50 {15, 5} · 55 {15, 7.5} · 60 {15, 10} · 65 {15, 10, 2.5} · 70 {15, 10, 5} · 75 {15, 10, 7.5} · 80 {15, 10, 7.5, 2.5} · 85 {15, 10, 7.5, 5} · 90 all

Params: colourway (Classic red / Results Series), dial setting (published steps), pose (lifted 80 mm out of the tray with only the selected plates, or racked). Footprint = tray (W × L), long axis along floor depth; pairs sit 80 mm apart.

## REP QuickDraw adjustable dumbbell (`rep-quickdraw-dumbbell`)

Sources checked 2026-09-19:
- [REP QuickDraw product page and spec table (DBS-6000)](https://repfitness.com/products/quickdraw-adjustable-dumbbell-lb), plus the [KG version](https://repfitness.com/products/quickdraw-adjustable-dumbbell-kg) and the [10 lb add-on](https://repfitness.com/products/quickdraw-adjustable-dumbbell-add-on-weight-lb)
- [Garage Gym Reviews QuickDraw review](https://www.garagegymreviews.com/rep-quickdraw-adjustable-dumbbells-review): 32 mm nickel volcano-knurl handle, steel Lock-N-Load switches, two steel support rods
- [Shredded Dad QuickDraw page](https://shreddeddad.com/product/rep-quickdraw-adjustable-dumbbells/): flat-bottom plates
- 17 REP gallery and detail photos: 30/40/50/60 lb thumbnails, switch and tube macros, the micro plate, the empty cradles and the add-on plate

Published dimensions: cradle 20.6 × 8.45 × 4.7" (523 × 215 × 119 mm); 7.9" (201 mm) tall with the dumbbell racked; 7.3" (185 mm) plates; dumbbell lengths 12.2 / 14.3 / 16.4 / 18.5" (310 / 363 / 417 / 470 mm) for the 30 / 40 / 50 / 60 lb sets; 32 mm grip, 5.4" (137 mm) clear, or 4.9" (124 mm) with the micro plates. The weight runs 5 lb up to the set maximum in 5 lb steps.

Derived from those numbers:
- Each 10 lb set step adds 2.1" of length, so each plate per side has a 26.7 mm pitch. The model uses a 25.2 mm plate and a 1.5 mm groove.
- Headplates are (310 − 137) / 2 − 2 × 26.7 = 33 mm.
- Micro plates are (137 − 124) / 2 = 6.35 mm.
- The plate centre is at 201 − 92.5 = 108.5 mm, so the plate rim rests on the cradle tubes.

Weight scheme: the 5 lb handle frame is two headplates, the grip and two support rods. Two 2.5 lb micro plates fit against the headplates, and N 5 lb plates go on each side (N = 2/3/4/5). `plates = floor((w − 5) / 10)`, and the micros are fitted when `(w − 5) mod 10 = 5`. Plates lock innermost first. The cradle tube numbers, which read 15–55 and 20–60 from inner to outer, confirm that order.

The model's `pose` param has two states:
- **Lifted (default):** the handle, micros and locked plates ride 80 mm up, and unlocked plates stay seated on the tubes.
- **Racked:** everything sits in the cradle.

Each plate's red slider tab sits toward the closed padlock when that plate is locked and toward the open padlock when it isn't.

Estimates:
- Flat-bottom chord, 9 mm sagitta.
- Switch facet, slot, tab (12 × 12, 7 mm proud) and icon sizes. Down = locked is an assumption.
- Top tooth notch 18 × 5 mm.
- Outer-face strip 55 → 22 mm wide, with two socket screws and a steel tongue.
- Headplate bracket, screws and red micro latch.
- Micro-plate U-slot (40 mm), finger slot and caution label.
- Support rods Ø19 at y ±60, z 60.
- Cradle tubes at y ±70: rubber Ø38 under the plates and bare Ø25 under the grip. Their centre, 29 mm, comes from resting the plate rim on them.
- Clip fins 22 × 40 mm.
- Saddle arch profile: 215 × 119 with r100 corners, a 115 × 45 tunnel and a 30 mm top notch. The notch trims the modelled saddle peak to 118.3 mm.
- REP logo as block letters inlaid 0.2 mm.
- Spacer blocks: plate profile clipped at 140 mm, 5 − N per side on the smaller sets.

The lifted pose uses the same 80 mm lift as the PowerBlock part. The part is scenery, excluded from print export.

## Eisenlink Adjustable Square Dumbbell (`eisenlink-square-dumbbell`)

Sources checked 2026-09-19:
- [Eisenlink square dumbbell collection](https://eisenlink.com/collections/square-dumbbell) and the [used-listing gallery](https://eisenlink.com/products/used-adjustable-square-dumbell-5pound-increments) (the new-product page is 404)
- [Amazon B0D5H6YQ4Z](https://www.amazon.com/dp/B0D5H6YQ4Z), current dimension graphic: 7.2 × 7.2 × 11.2", 6.8" handle
- [Eisenlink FAQ](https://eisenlink.com/pages/faqs): 3.7" screw
- [Garage Gym Reviews Eisenlink review](https://www.garagegymreviews.com/eisenlink-adjustable-dumbbell-review): 1.37" handle, 10–80 lb, 5 lb increments
- [Glucks Gym review](https://glucksgym.com/blogs/news/eisenlink-adjustable-dumbbell-review): 35.5 mm handle, 2.5 lb screws, 10 lb handle
- 19 photos: studio iso, the 50 and 80 lb kit layouts, the locking section, the adjustment steps, the dimension graphics and the screw

Published dimensions: 7.2" (183 mm) square plates; 5 lb plates 0.4" (10.2 mm) thick; 11.2" (284 mm) long at 50 lb; 6.8" (173 mm) clear handle, 35.5 mm across; 3.7" screws weighing 2.5 lb each. The handle weighs 10 lb with its fixed end plates. The 50 lb kit has 6 × 5 lb and 2 × 2.5 lb plates, and the 80 lb kit has 12 × 5 lb and 2 × 2.5 lb. Eisenlink's older graphic gives 6.9" / 10.4"; the model uses the current 7.2" / 11.2" figures.

Weight scheme (symmetric loading):
- 10 lb is the bare handle and 15 lb adds both screws.
- One 5 lb plate goes on each side per 10 lb above that, and the 2.5 lb plates go on for the odd 5.
- For w ≥ 15: `plates = floor((w − 15) / 10)` and `small = (w − 15) mod 10 = 5`.
- The 50 lb set has 9 settings (published) and the 80 lb set has 15.

There is no cradle. Only the loaded plates are on the handle, so the length and footprint grow with the weight: 194 mm bare, 222 mm with screws, 284 mm at 50 lb and 345 mm at 80 lb. The 80 lb length isn't published; it comes from the same stack arithmetic.

Estimates:
- 10.5 mm fixed end plates.
- 2.5 lb plates as thick as the 5 lb plates. The window takes out the weight: a full 183 × 10.2 plate is about 5.9 lb of steel.
- Ø94 × 14 mm knurled chrome screw head. It sinks 9.8 mm into the 2.5 lb window, which closes the published 284 mm exactly. The research pass estimated a smaller Ø66 head, but the studio photos show a head about 55% of the plate width.
- 24 mm corner radius.
- Finger slot 55 × 17 mm, 30 mm below the top.
- 34 mm U-slot (5 lb plates) and 40 mm U-slot (2.5 lb plates).
- 2.5 lb window 124 × 112 mm.
- Stainless pins Ø10 × 3 at (±66, +62) and (±66, −5).
- Ø20 screw shank.
- Ø45 weld collars.
- Etched logo as a flat grey inlay.
- Raised rings stand in for the diamond knurl.

The part is scenery, excluded from print export.

## Snode AD80 (`snode-ad80`)

Sources checked 2026-09-19:
- [Snode AD80 product page](https://www.snodesport.com/products/ad-80-quick-adjusting-dumbbells) (gallery via `products/ad-80-quick-adjusting-dumbbells.json`)
- [Northern Fitness spec table](https://www.northernfitness.ca/products/ad80-adjustable-dumbbell-set)
- [Garage Gym Reviews: Snode adjustable dumbbell review](https://www.garagegymreviews.com/snode-adjustable-dumbbell-review)
- Nine gallery/lifestyle photos reviewed (pair in cradles, magnetic caps, overhead, one lifted at a light setting, end faces).

Published dimensions used: dumbbell 460 × 170 × 170 mm (18.11 × 6.68 × 6.68 in) at 80 lb; cradle 490 × 190 × 90 mm (19.29 × 7.48 × 3.54 in), cast iron; grip 115 mm × Ø36 knurled chrome; 10–80 lb in 10 lb steps (8 settings); optional 1.25 lb magnetic caps (two per end face, "24 settings").

Mechanism: one collar dial between the grip and the plates (window shows the setting) drives rods out of both handle ends. The 10 lb handle picks up seven 5 lb plates per side from the inside out; unselected outer plates stay seated in the cradle. The lifted pose raises the handle and its selected plates 80 mm above the cradle.

Estimates: plate pitch 16.5 mm (7 × 16.5 = 115.5) with 0.7 mm seams, 22 mm inner hub casting and 35 mm chrome cone flange per side, all solved from the 460 mm envelope (115 + 2 × (35 + 22 + 115.5) = 460); plate bottom seated 18 mm above the floor; dovetail keys (18 mm wide, stepped 14 mm per plate) giving the staircase seam across the top; outer-face key notch, keyhole, centre hole and Ø110 face ring; three kidney windows and a pin hole in the hub face; cradle end blocks as 122/190 mm trapezoids with a Ø173 saddle, 82 mm end wall with U-notch and pin hole, foot tunnel and raised wordmark bar; chrome side tubes Ø22 on an 8 mm base plate; magnetic caps Ø38 × 14 mm at ±24 mm (on the carried stack's end face when lifted, on the full stack's end face when racked).

## Trulap 8592 G4 (`trulap-8592-g4`)

Sources checked 2026-09-19:
- [Trulap 8592 G4 product page](https://trulap.com/products/8592g4) (gallery via `.json`), [Trulap EU](https://www.trulap.eu/products/8592g4), [The Fitness Outlet listing](https://thefitnessoutlet.com/products/trulap-8592-g4-dumbbells)
- [Garage Gym Reviews: Trulap adjustable dumbbells review](https://www.garagegymreviews.com/trulap-adjustable-dumbbells-review) (lb chart, 17.32 × 7.67 in max)
- [Shredded Dad: Trulap review](https://shreddeddad.com/trulap-adjustable-dumbbells/) (10.5 in at 8.5 lb, 17.375 in at 92 lb)
- Ten photos reviewed (end faces, 3/4 pairs, front elevation at max, top view for fin count, lifted handle).

Published dimensions used: 195 mm plates; handle 127 mm × Ø34 (GGR 36 mm); dock 500 × 215 mm; length 267 mm at the minimum and 441 mm at the maximum; 26 settings, 4–41.5 kg in 1.5 kg steps, labelled with Trulap's lb chart (8.5, 12, 15.5 … 89, 92 lb). The weight param is stored in kg.

Mechanism: twist the handle in the dock; each 1.5 kg step extends the rods to pick up one more plate, alternating ends (13 selectable plates on +X, 12 on −X, counted ≈12–13 top fins per side in the photos). Selected plates lift with the handle; the rest stay in the dock.

Estimates: plate pitch 7 mm (25 × 7 = 175 = 441 − 267 + 1) with 0.8 mm seams; per side a 30 mm domed hub (black indicator ring, weight window, wordmark) and a 40 mm fixed core stack (the 4 kg handle) = 70 mm, so 127 + 140 = 267; top comb notch 17 mm deep × 104 mm wide with a thin silver fin per plate over a black spacer; outer end face on each end's last plate with a black TRULAP wordmark bar, centre release button and two pin holes; plate bottom 75 mm above the floor in a 95 mm saddle block; each end cradle on an inner (32 mm) and outer (28 mm) leg with a centre latch tower at the outer end; stainless tubes Ø25 at 70 mm with a dark "TRULAP 8592" label band.
