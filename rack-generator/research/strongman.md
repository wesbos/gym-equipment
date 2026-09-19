# Strongman implements (issue #118)

Sources checked 2026-09-19. Popularity (gyms owning it) from Gym Radar, Sep 2026. Photos were downloaded and reviewed as contact sheets: the manufacturer gallery (Shopify `products/<handle>.json`, Rogue `assets.roguefitness.com` w_1600 gallery) plus Gym Radar owner photos (`gymradar.com/equipment/<slug>`). All dimensions in the code are millimetres converted from the published inches.

Shared conventions:
- Floor parts, Z up, origin at the footprint centre. Every build is re-centred and checked against its footprint by `strongmanKit().done()`; organic soft goods are fitted back onto their nominal footprint (at most 7-20% scale) after the fabric warp.
- Loadable implements take a `load` preset (`strongman-loads.ts`): Rogue-spec iron 45/25 lb and IWF bumpers from `plates.ts`, filtered by the implement's loadable length. Horizontal implements rest on their plates once the plate radius exceeds their own.
- No logo artwork: prints are flat plates/bands in the print colour (shield, band or bar outline only).
- Sand-filled sizes: packed builder's sand is 1.6-1.7 kg/L; filled shells bulge past their nominal diameter, so heights are fitted at an effective 1.8-1.95 kg/L (Rogue's published 16" table implies 1.78 kg/L).

## Sandbags

| Entry | Source | Published | Estimated |
|---|---|---|---|
| `cerberus-dual-ply-sandbag` (75) | [cerberus-strength.com/products/dual-ply-sandbag](https://cerberus-strength.com/products/dual-ply-sandbag), 16 gallery photos + 6 owner photos | 8 sizes 45-180 kg with bag heights 21.5 / 28.4 / 37.9 / 47.3 / 56.8 / 66.2 / 75.6 / 85 cm; 1050D Cordura, YKK zip, double Velcro straps | 40 cm diameter (photo width:height ratios across all 8 sizes and 45 kg = 27 L check), black top band depth, strap width |
| `rogue-strongman-sandbag` (66) | [roguefitness.com/rogue-strongman-sandbags](https://www.roguefitness.com/rogue-strongman-sandbags), 5 gallery + 7 owner photos | Height x diameter (in): 25 lb 4.5 x 11.5, 50 lb 6 x 13, 100 lb 7.5 x 16, 150 lb 11.5 x 16, 200 lb 15.5 x 16, 250 lb 19.5 x 16, 300 lb 22.5 x 16, 400 lb 36 x 16; black 1000D Cordura, white Rogue logo on the zipper flap | Flap 0.78 x 0.3 of diameter, seam piping |
| `rogue-echo-strongman-sandbag` (42) | [roguefitness.com/rogue-echo-strongman-sandbags](https://www.roguefitness.com/rogue-echo-strongman-sandbags), 5 gallery + 5 owner photos | Same height/diameter table as the USA bag; handle-less, logo on flap | As above |
| `rogue-cyclone-strongman-sandbag` (14) | [roguefitness.com/rogue-cyclone-strongman-sandbags](https://www.roguefitness.com/rogue-cyclone-strongman-sandbags), 5 gallery + 3 owner photos | 100 lb 20" H, 14" top, 8" bottom; 150 lb 20/16/9.5; 200 lb 20/18/12; 250 lb 24.5/18/12 | Belly, flap |
| `freedom-strength-strongman-sandbag` (63) | [freedomstrength.us/products/strongman-sandbag](https://freedomstrength.us/products/strongman-sandbag), 19 gallery + 9 owner photos | 15 sizes 50-400 lb (25 lb steps); limited white 50/100/150/200; black with red top panel, "flap-free" top | No dimensions published: 16" shell, height from fill volume at 1.95 kg/L (50 lb 171 mm ... 400 lb 717 mm) |
| `bells-of-steel-fitness-sandbag` (34) | [bellsofsteel.com/products/sandbags](https://www.bellsofsteel.com/products/sandbags), 16 gallery + 7 owner photos | 8 sizes 50-400 lb; three handles; triple leak prevention | No dimensions published: 15.5" shell, heights from fill volume at 1.9 kg/L (min 0.42 d), 36 mm side-handle reach |
| `rep-sandbag` (44) | [repfitness.com/products/sandbags](https://repfitness.com/products/sandbags), 24 of 51 gallery photos + 8 owner photos | S 5-25 / M 25-75 / L 50-125 / XL 125-200 lb; "20" long for a small bag up to 36" for the XL"; seven riveted handles; 7 colours (blue and pink only S/M) | Diameters 8.5 / 10 / 11.5 / 12.5"; medium and large lengths interpolated (25", 30"); 78% slump; camo as blotch patches |
| `cerberus-throwing-sandbag` (37) | [cerberus-strength.com/products/strongman-throwing-bag](https://cerberus-strength.com/products/strongman-throwing-bag), 10 gallery + 5 owner photos | 10 / 20 / 35 kg; silicone handle 10.5" x 1.5" | Bag diameters 26 / 32 / 38 cm and heights from fill volume; handle rise 150 mm |
| `cerberus-husafell-sandbag` (17) | [cerberus-strength.com/products/dual-ply-husafell-sandbag](https://cerberus-strength.com/products/dual-ply-husafell-sandbag), 16 gallery + 4 owner photos | 7 sizes 60-180 kg; internal bracing holds the coffin-hexagon shape | Outline traced from the front-view product shots (top 0.62 W, widest at 0.28 H below the top, bottom 0.58 W); H = 1.1 W, T = 0.38 W, W from volume at 1.75 kg/L (60 kg 475 mm ... 180 kg 688 mm) |
| `cerberus-sandstone-sandbag` (16) | [cerberus-strength.com/products/sandstone-strongman-sandbag](https://cerberus-strength.com/products/sandstone-strongman-sandbag), 16 gallery + 4 owner photos | 7 sizes 20-140 kg | Diameter from fill volume at 1.75 kg/L with a 0.86 height ratio; panel seams approximated |

## Stones, kegs, tyres

| Entry | Source | Published | Estimated |
|---|---|---|---|
| `diy-strongman-keg` (61, DIY) | Gym Radar owner photos (10) of US kegs; US keg size standard | 1/2 bbl 16.1" x 23.3" (15.5 gal); 1/4 slim 11.1" x 23.3"; sixtel 9.25" x 23.3"; 1/4 stubby 16.1" x 13.9" | Chime height, band positions, hand-hold size; fill weight (water 8.34 lb/gal, dry sand 1.6 kg/L) is shown in the option label only |
| `diy-atlas-stone` (57, DIY) | Gym Radar owner photos (8); Rogue/Slater mould sizes | 10-24" mould diameters | Weight at 150 lb/ft³ concrete; equator seam, pour flat |
| `diy-natural-stone` (37, DIY) | Gym Radar owner photos (7) | — | Granite 2650 kg/m³, ratio ~1 : 0.75 : 0.5; unit volume 0.19 L per 1000 mm length measured from the generated shape |
| `diy-strongman-tire` (24, DIY) | Gym Radar owner photos (8) | Tyre sizes 18.4-34, 18.4-38, 20.8-38, 23.1-26, 28L-26, 30.5L-32 (Firestone/Titan ag data books: OD 64.4 / 68.3 / 72.8 / 63.4 / 64.4 / 71.9") | Lug count/angle/depth (R-1 bar, 42 degrees), typical used weights |
| `titan-husafell-stone-carry` (20) | [titan.fitness/products/husafell-stone](https://titan.fitness/products/husafell-stone), 7 gallery + 5 owner photos | 30" H, 28.5" W, 18.5" top edge, 8" bottom edge, 6" thick, 97 lb | 9.5" shoulder drop, 3/16" wall, slot and scoop sizes |
| `mike-bartos-stone-of-steel` (16) | mbpowercenter.com (archived 2024-08), elitefts.com feature, barbend.com; 6 owner photos | 20" (135 lb empty, to 450+ lb) and 17" (100 lb empty); flat black powder coat; top bolt removed with the multi-tool | Seam, boss, print band |
| `diy-atlas-stone-platform` (13, DIY) | Gym Radar owner photos (7) incl. the common build plan | Plan: 36" x 36" top, 48" high, 2x6 legs/aprons, 2x4 rails, 3/4" plywood | Heights 36-52", rail heights, 3/8" mat |

## Handles, yokes, logs, circus dumbbells

| Entry | Source | Published | Estimated |
|---|---|---|---|
| `titan-upright-farmers-walk-handles` (44) + Link Connectors (14) | [titan.fitness/products/upright-farmers-walk-handles](https://titan.fitness/products/upright-farmers-walk-handles) (12 photos incl. dimension drawings), [link connectors](https://titan.fitness/products/upright-farmers-walk-handles-link-connectors) (4), 7 + 4 owner photos | 50" x 9" x 18"; 3" 11-ga tube; handle 8" long, 31 mm, 8"/16" from the ground; sleeves 49 mm x 11"; 44 lb; connectors 28.5" x 3.375", platform 50" x 32" | Post inset 3.5", foot plates, connector saddles, pins. Link Connectors are the `mode` param (single handle vs connected pair) rather than a separate entry, since they only exist attached to two handles |
| `titan-farmers-walk-handles` (24) | [titan.fitness/products/farmers-walk-handles](https://titan.fitness/products/farmers-walk-handles), 8 photos + 3 owner photos | 60" long, 50 mm, 12" sleeves, 5.5" x 32 mm handle, 17 lb | Frame bars 12 x 44 mm, 105 mm rise |
| `rogue-farmers-walk` (14) | [roguefitness.com/rogue-farmers-walk](https://www.roguefitness.com/rogue-farmers-walk), 5 gallery + 2 owner photos | 60"; 1.5" Sch 80 shaft (48.26 mm); 1" Sch 40 handle (33.4 mm); 12" sleeves; 21.5 lb | Handle length, frame bars, rise |
| `cerberus-replica-dinnie-stone-handles` (27) | [cerberus-strength.com/products/cerberus-dinnie-stone-handles](https://cerberus-strength.com/products/cerberus-dinnie-stone-handles), 5 gallery + 8 owner photos | Pair 6.4 kg; replica ring shapes and pick-up heights; split pin loading | Ring sizes from the Rogue Dinnie set (7" x 6.5", 6.25" x 5.25"), ring tops 20.5" / 19.5", 2" pin, 152 mm foot |
| `rogue-dinnie-ring-set` (22) | [roguefitness.com/rogue-dinnie-ring-set](https://www.roguefitness.com/rogue-dinnie-ring-set), 5 gallery + 8 owner photos | Large 7" x 6.5", small 6.25" x 5.25", 5/8" steel, hand forged | Forging irregularity |
| `titan-t3-series-yoke` (42) | [titan.fitness/products/t-3-series-yoke](https://titan.fitness/products/t-3-series-yoke), 14 photos incl. drawings + 5 owner photos | 72"/92" H, 52" W, 53" D, 45" interior, 2x3 11-ga uprights, 2.95" crossbar, 48 mm x 15.5" horns, 166/178 lb | Horn positions (17" from centre), skid shape, bracket and gusset sizes |
| `rogue-y1-yoke` (19), `rogue-y2-yoke` (13) | [roguefitness.com/rogue-yoke](https://www.roguefitness.com/rogue-yoke), [y2-yoke](https://www.roguefitness.com/y2-yoke), 3 + 2 gallery + 10 + 3 owner photos + GGR review photo | 72" / 92"; 50" x 48" footprint; 2x3 11-ga uprights; 3" crossbar; J-cups; four skid/storage feet | 44" interior, 1.9" x 12" posts at 19", J-cup height |
| `titan-rackable-strongman-log` (33 + 10" 19) | [titan.fitness/products/rackable-strongman-log-bars](https://titan.fitness/products/rackable-strongman-log-bars), 24 photos incl. 3 drawings + 5 + 6 owner photos | 8": 7.75" x 71.25", 10" sleeves, 23.75"; 10": 10" x 74.4", 11.875" sleeves, 26"; 12": 11.3" x 80.3", 14" sleeves, 26"; 42 mm handles, 48 mm sleeves; 50/70/84 lb | Drawing spans read as handle spacing; 6" cut-outs from 0.2 R below the axis over the top; collar 72 x 25 mm |
| `abmat-log-crash-cushions` (13) | [abmat.com/products/log-crash-cushions](https://abmat.com/products/log-crash-cushions), 8 photos + 8 owner photos | 43 x 20 x 12 in, 18 oz black ripstop vinyl, rebond foam, pair | Print sizes, strap |
| `titan-circus-dumbbell` (14) | [titan.fitness 12"/2.5"](https://titan.fitness/products/12-in-circus-dumbbell-2-5-in-handle) and [10"/2"](https://titan.fitness/products/10-in-circus-dumbbell-2-in-handle), 10 photos each incl. drawings + 2 owner photos | 10": 10.7" bells, 30.2" long, 77 lb; 12": 12.8" bells, 28.25" long, 85 lb; 5.3" handle; 2 / 2.5 / 3" handles; 10.75" internal sleeve | End cap detail |
| `mike-bartos-training-circus-dumbbell` (15) | mbpowercenter.com (archived 2025-08), 6 owner photos | 12" CDB, 99 lb, 2.375" handle | 9" bell length, 6" handle gap |

The generic "Circus Dumbbell (26, DIY)" is covered by the Titan and Bartos entries: the owner photos show welded pipe bells of the same form, with no common dimensions to model separately.

## Skipped

- **Pitbull 12" Strongman Log (16)**: Pitbull Strongman Equipment is out of business; no specifications survive (the product review video states none), only 7 owner photos. Not modelled rather than guessed.
