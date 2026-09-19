# Rack-part registry proof entries (#131)

Two rack-mounted brand attachments prove the `defineRackPart` contract (rack-part.ts / rack-registry.ts): a through-pin
accessory (band peg) and a single-pin pad with a param-dependent bolt pattern (leg roller). Sources checked 2026-09-19.

## Rogue Monster Band Peg 2.0 (`rogue-monster-band-peg-2`)

Sources:
- [Rogue product page and Gear Specs](https://www.roguefitness.com/monster-band-pegs-2-0-4-pack): 11 in total length including the cap, 1 in diameter, 9 lb per 4 pegs, bright zinc or proprietary matte black, made in USA. The description says the machined two-piece version has a chamfered cap and the solid cast version has a hex head. Fully inserted in a 3 in tube, the non-cap end sticks out 7-3/8 in. For Monster racks only, not Monster Lite, Infinity or Econ.
- Rogue gallery, 8 images: `MBPEGS-H`, `MBPEGS-TH` (four matte-black machined pegs), `MBPEGS-web2` to `web5` (installed through Monster base and upright holes with bands; close-up of the machined cap), `RA1588-BR-TH` (four bright-zinc hex pegs) and `RA1588-IL-TH` (four black hex pegs).

| Dimension | Value | Basis |
|---|---|---|
| Overall length incl. cap | 279.4 mm (11 in) | published |
| Rod diameter | 25.4 mm (1 in) | published |
| Proud of mounting face, 3 in tube | 187.3 mm (7-3/8 in) | published |
| Cap / head height | 15.9 mm (5/8 in) | derived: 11 - 3 - 7.375 in |
| Machined cap diameter | 38.1 mm (1.5 in) | estimated: about 1.5 times the rod in the close-up |
| Hex head across flats | 38.1 mm (1.5 in) | estimated: standard 1 in hex-head proportions, checked against RA1588 photos |
| Cap chamfer / tip chamfer | 3.2 mm / 1.6 mm | estimated |

Modelling: a solid rod runs through the upright from the far face, and the cap bears on the far face. That matches the
installed photos, where the cap sits on one face and the peg sticks out of the opposite face. Params: `head` (machined
chamfered cap / standard hex head) and `finish`. The machined version comes only in matte black, so `finish` offers
bright zinc only with the hex head. Pairs are on by default, since the pegs sell as a 4-pack and are used in left and
right pairs. The suggested mount is the outer side face at hole 2 (115 mm), with the pegs pointing past the bar
sleeves for band work. The bore check uses the 1-inch class value (`PIN_1IN` = 24.8 mm), so 5/8 in racks (REP PR-4000,
BOS Hydra) refuse the peg.

## REP Fitness Leg Roller, original (`rep-leg-roller`)

Sources:
- [REP product page](https://repfitness.com/products/leg-roller-attachment) and `products/leg-roller-attachment.json`, with variants 4000 (PRA-4710), 5000 (PRA-5712) and 5000 Pair (PRA-5712-2). Specs: the 4000 is 12.8 lb and 33.4 in long, with a 17.4 in by 4.9 in pad, 8- and 11-gauge tubing and steel, extends to the centre inside the rack, and fits 5/8 in pinholes. The 5000 is 4.4 lb and 20.1 in long, with a 15.4 in by 4.8 in pad, a chrome-plated solid cylinder, and a pad that sits next to the upright inside or outside. It fits 1 in pinholes. Both are rated to 600 lb.
- REP images: `PRA-4710-LegRoller-Thumbnail`, `PRA-5712-LegRoller-Thumbnail`, `PRA-5712-LegRoller-Pair-Thumbnail` and `acf.PRA-4710-Leg-Roller-Main.png`.
- [BarBend Nordic bench review](https://barbend.com/best-nordic-benches/): 6 photos of the 5000 on a white REP rack. They show the shaft through a low upright hole, the pad against the face, the lynch pin inserted behind the far face, and use for Nordics.
- [Garage Gym Reviews 5000 page](https://www.garagegymreviews.com/equipment/rep-fitness-5000-leg-roller): product photo. The text confirms a single pin across the rack.

| Dimension | 5000 | 4000 | Basis |
|---|---|---|---|
| Overall length | 510.5 mm | 848.4 mm | published |
| Pad length | 391.2 mm | 442.0 mm | published |
| Pad diameter | 121.9 mm | 124.5 mm | published |
| Shaft / arm | 24.5 mm chrome shaft | 31.75 mm (1-1/4 in) arm tube | estimated from pad-to-tube ratio in photos |
| Collar disc | 50 × 8 mm | — | estimated |
| Hanger plate | — | 76 × 126 × 6.35 mm | estimated: the width matches a 3 in upright |
| Pop-pin | — | 5/8 in, one station below the top pin | estimated from the red pull ring and sleeve |
| Arm U-bend | — | 32 mm radius, 55 mm behind the plate | estimated |

Modelling: in the 5000, the collar, pad and end bolt stack from the mounting face, and the shaft runs back through the
upright to a lynch pin. In the 4000, the hanger plate carries a top pin in the target hole and a pop-pin in the hole
one station down, so its `holes` are [0, -1]. The arm leaves the plate toward -X, U-bends outward, and runs +X to the
pad. It is `handed`, so the second unit of a pair is mirrored. `autoFit` picks the 4000 on racks with bores under
20 mm. The suggested mount is param-dependent: the 5000 goes on the inner side face at 215 mm, and the 4000 on the back
(inside) face of a front upright so the arm reaches the rack centre. The pad vinyl is dark charcoal, the 4000 steel is
black powder coat (a fixed factory colour, role `source`), the 5000 shaft is chrome, and the pull ring is red.

Known estimates: the 4000 bracket geometry (sleeve box, weld plate and bend) is reconstructed from two product photos
only. Pad end gathers are simplified to a smaller disc with a bolt head.
