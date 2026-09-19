# Leg extension/curl, leg press and hack squat machines (#120)

Sources checked 2026-09-19. For each product I read the spec table on the manufacturer page (Shopify `products/<handle>.json` and the rendered page). I downloaded the gallery at full size and looked at every image: front, side, rear and 3/4 views, close-ups of pads, dials, cams, horns, pins and footplates, the in-use shots, and the dimension panels. Where the maker publishes an assembly manual, I also looked at its exploded views.

| Product (part id) | Spec source | Photos viewed | Manual |
|---|---|---|---|
| Titan Leg Extension & Hamstring Curl, 401556 V2 (`titan-leg-extension-curl`) | [titan.fitness](https://www.titan.fitness/products/leg-extension-curl-machine) spec table | 13 gallery images | [Operator's manual LEGEXTCRLV2](https://manuals.titanfitness.com/24845): exploded view and parts list |
| GMWD LE08 2.0 (`gmwd-le08-leg-extension-curl`) | [gmwdfitness.com](https://www.gmwdfitness.com/products/commercial-leg-extension-prone-leg-curl-machine-le08) "Details" and "Measurements" | 26 gallery images, including the product-size, load-ratio, back-pad and 8+9-position panels | none published |
| Lionscool Leg Extension & Curl V4.0 (`lionscool-leg-extension-curl-v4`) | [lionscool.com](https://lionscool.com/products/lionscool-leg-extension-machine) dimensions block | 9 gallery images, including the space-efficient dimension panel and the dual-mode side views | [V4 owner's manual](https://www.lionscool.com/cdn/shop/files/Leg_Extension_4.0_Manual.pdf) |
| RitFit PLC01 (`ritfit-plc01-leg-extension-curl`) | [ritfit.com](https://www.ritfit.com/products/ritfit-plc01-leg-extension-curl-machine) "PLC01 General Info" | 9 gallery images (black and pink) | [PLC01 manual](https://cdn.shopify.com/s/files/1/2350/9323/files/PLC01-MANUAL-26.1.7.pdf) |
| Temple of Gainz Selectorized Leg Extension + Seated Leg Curl V3 (`tog-selectorized-leg-extension-seated-curl-v3`) | [templeofgainz.com](https://templeofgainz.com/products/selectorized-leg-extension-seated-leg-curl-version-3) copy and dimensions panel | 18 gallery renders | QR-code only (not public) |
| Titan Selectorized Leg Extension and Curl, 401926 (`titan-selectorized-leg-extension-curl`) | [titan.fitness](https://www.titan.fitness/products/selectorized-leg-extension-and-curl-machine) spec table | 12 gallery images | [Operator's manual SZLEGEXTCRL](https://manuals.titanfitness.com/30243): exploded view and parts list |
| Force USA Compact Leg Press & Hack Squat, 2027 model (`force-usa-compact-leg-press-hack-squat`) | [forceusa.com](https://www.forceusa.com/products/compact-leg-press-hack-squat) dimensions and FAQ | 24 gallery images | [F-CLP-V4 manual](https://force-manuals.nmg.io/F-CLP-V4_MANUAL_13-05-2026.pdf): hardware identifier and step drawings |
| Temple of Gainz THE QUADSEND (`tog-quadsend-leg-press-hack-squat`) | [templeofgainz.com](https://templeofgainz.com/products/plate-loaded-the-quadsend-37-5-degree-leg-press-plus-hack-squat-machine-combo) | 11 gallery renders, including four dimension panels | none published |
| Titan Leg Press Hack Squat, 401486 (`titan-leg-press-hack-squat`) | [titan.fitness](https://www.titan.fitness/products/leg-press-hack-squat-machine) spec table | 14 gallery images | [Operator's manual LEGPRSKIT](https://manuals.titanfitness.com/10814): exploded view |

## Published dimensions used

| Machine | L × W × H | Other published figures |
|---|---|---|
| Titan LEC | 36" D × 42" W × 39" H | seat 22" × 17" × 2", back pad 15" × 10" × 2", rollers 17" × 5", seat height 24–26.5", weight post 10" × 49 mm, 7 seat-depth and 7 knee-pad positions, seat angle 7/10.5/14°, 11-ga steel, 300 lb |
| GMWD LE08 2.0 | 54.6" L × 55.4" W × 38.8" H (62.6" as a curl) | 21.7" shin roller, 10.6" load horn, 10" storage posts, 2.4" pads, 7.3" grips, 7 back-pad positions, 8 lever + 9 tibia settings, 1.1/1.2 ratio, 12-ga steel, red/black/white/blue arms |
| Lionscool V4.0 | 40.8" L × 33" W × 38.3" H | backrest 12.4" × 21.6", seat 16" × 16.7", 19.7" leg roller, 16" thigh roller, dual 7.1" horns, 2.2" pads, 1:1 |
| RitFit PLC01 | 50.9" L × 43.5" W × 42.7" H | 13.01" weight holder, 16.54" leg stop, 4 backrest angles, 12 range positions, 3:2 cable ratio, 375 lb, black/pink |
| ToG V3 | 46.5" L (64.9" extended) × 38.8" W (29.8" frame) × 61" H | 28.3" frame footprint, 120 kg stack at 1:1, 9 arm + 5 roller + 8 thigh-pad positions |
| Titan selectorized | 60" D × 36" W × 63" H | 10 lb start and 250 lb stack in 10 lb steps (24 plates + top in the parts list), spiral cam, 5 mm cable, pulleys Φ115 × 3 and Φ95 × 1, 7 back and 7 thigh positions |
| Force USA CLP | 65" D × 52" W × 57" H | footplate 35" × 29.5", 30° incline, 38 lb sled, 700 lb + 320 lb user |
| ToG Quadsend | 99.3" L × 66.2" W (standard horn) × 56.2" H | frame 32.5", handles 42.3", storage horns 57.3", Shorty horn 50.2", band pegs 50.8", LP footplate 30.5" × 22", HS footplate 36" × 24", 37.5° |
| Titan LPHS | 84" L × 40" W × 53" H | 45° carriage (80 lb), LP footplate 21" × 15", LP back 10.5" × 31", HS footplate 26" × 22" (4 positions), HS back 20" × 15", shoulder pads 4.5" × 8" at 7.5" spread, sleeves 11.25", storage posts 11.75", 49 mm |

`leg-machines.test.ts` re-types these envelopes and checks the default build against them. The tolerance is 60 mm for leg extensions and 80 mm for the larger machines, because published envelopes round to the inch and some include horns or handles.

## Measured from photos (estimates)

- **Pivot heights and lever lengths** are scaled from the side views against the published seat, roller and envelope sizes. Examples: the Titan LEC knee pivot is at 716 mm with a 432 mm leg arm and a 440 mm weight arm; the GMWD pivot is at 640 mm with a 392 mm arm. The three "Lever position" poses (start, mid-rep, peak) are angles picked from the in-use photos.
- **Linkages.** The GMWD crank-and-link load lever is solved as a four-bar linkage from the photographed crank, link and lever lengths. On the Lionscool and the RitFit, the cable winds on a drum at the knee pivot, runs over one idler and lifts a hinged load lever; the lever angle is solved from the cable length (3:2 on the RitFit, per its spec). On the selectorized machines, the cam radius sets how far the headplate and the pinned plates lift. Only plates at or above the pin rise.
- **Stacks.** Plates are about 280 × 130 mm and 26–27 mm thick, estimated from the renders. Label strips are colour-banded as photographed: green, yellow and red on the Titan, and white, grey and red on the Temple of Gainz.
- **Leg presses.** Rail spacing, rail length, sled length and travel are estimated from the side photos. The sled pose runs from racked on the safeties to about 360–600 mm up the rails. Hack-squat mode reclines the seat and back (Force USA), swaps the leg-press footplate for back and shoulder pads (Quadsend), or folds the carriage footplate away and flips the front unit to its footplate face (Titan).
- **Upholstery, frames and branding.** Pad thickness, corner radius and stitching are taken from the close-ups. Frames are satin or matte black powder coat, and the GMWD arms use their four published colours. Logos and placards are plain flat plates, never copied artwork. The Quadsend and ToG side panels carry the laser-cut logo area as a flat inlay.
- **Plates** are 45 lb iron plates (`buildPlateStack`), loaded from the horn collar. The `plates` param is per horn or sleeve, capped at the plates that physically fit on the published sleeve length.

## Not shipped

- **Mikolo TAWERET 1:1 Leg Extension & Curl.** Mikolo's current store (gym-mikolo.com, 177 products listed) has no TAWERET product; it now sells the NOVA and LUNA machines. mikolo.com returned 503, and Amazon search results showed no TAWERET listing. Without a spec source or photos of that exact model, I did not build it.
- **REP Fitness leg press / hack squat.** REP's store search for "leg press" and "hack squat" returns only the bench leg-extension attachment, leg rollers and the belt squat. REP sells no leg press or hack squat machine, so there is nothing to model.

## Geometry contract

Each machine is one pure description (`floor-parts/leg-machines-models.ts`) written against a small `Kit` interface of boxes, beams, rods, pads, polygons, cables, holes and plate stacks, with a transform stack. `parts/leg-machines.ts` runs it through `ManifoldKit` to produce the solids. `floor-parts/leg-machines-kit.ts` runs it through `BoundsKit` to produce the footprint, which is the exact bounds of the ideal shapes. Posing a lever, moving a sled or loading plates therefore moves the footprint and its offset, and the tests hold the build to within 1.5 mm of it. Groups are unioned per material, holes are subtracted, and a 10 µm `simplify` removes coplanar-seam slivers so that every solid passes the print-mesh check. Every intermediate Manifold is freed.
