# Trap, curl, axle and multi-grip bars (#109)

Eighteen floor entries in section **Barbells**, from `floor-parts/trap-curl-axle-bars.ts` (specs, envelopes, catalog
entries) and `parts/trap-curl-axle-bars.ts` (five shared builders). Sources checked 2026-09-19. Every product was
checked against at least 8 photos (manufacturer galleries via Shopify `products/<handle>.json` or Rogue's Cloudinary
gallery, plus retailer and review photos where the maker has fewer).

## Shared construction

| Builder | Products | Local frame and rest pose |
|---|---|---|
| `buildAxle` | Titan 84" (and 60") axle, Fringe 20 kg axle, Fringe Stubby | One 2" tube; twin-flange collars; resting on the collars. |
| `buildCurlBar` | Rogue Curl Bar, Rogue Rackable, REP Rackable, CAP 47", BoS 45" | Shaft centreline half-profile in the horizontal plane (bends lie flat), filleted and swept as one mesh; knurl only on the angled grips; resting on the collars. |
| `buildOpenTrap` | REP Open Trap, Kabuki Trap Bar HD, Giant Northland, BoS Open Trap | Built in the jack pose (standing on its feet, U up, as stored/photographed); `pose: 1` rotates it flat. Handles are vertical in the jack pose; the high handle is at −y so it ends up on top when flat. |
| `buildTB2` | Rogue TB-2 | Mitred 1.5" square-tube hexagon ring, flush + raised U handles, lying on its sleeves. |
| `buildMultiGrip` | Kabuki Kadillac, REP Cambered Swiss, Rogue MG-4CN, BoS Arch Nemesis, Titan Multi-Grip | Camber **up**, as every maker photographs them racked (MG-4CN and Kadillac front views, REP hero shot, BoS rack shot); rails are mitred strips (rect/plate), swept round tube (REP) or a flat ring (Titan). Resting on sleeves/collars/end blocks. |

Footprints are analytic (`*Envelope` functions) and the tests compare them to the built bounding boxes. `barAxisZ(id, params)`
gives the sleeve-axis height in the rest pose for a future per-bar cradle geometry (#83's `parkedPose` currently assumes
the 28 mm Olympic-bar axis; rackable bars here are within a few mm of that except the REP Swiss bar, whose twin bracket
plates hold its axis 10 mm higher, and the 2" axles, whose shafts sit ~5–9 mm into J-cup liners).

## Axles

- **Titan Axle Barbell** — [titan.fitness/products/axle-barbells](https://titan.fitness/products/axle-barbells), [support spec page](https://support.titan.fitness/hc/en-us/articles/4905755451405-84-in-Axle-Barbell). 84": 52" grip, 15.5" sleeves, 1.98" (50.3 mm) grip and sleeve; 60" (param): 43" grip, 8" sleeves, 49 mm (dimension drawing). Black powder coat, hollow tube ends. 16 gallery photos. *Estimated*: collar Ø68 × 12.5 mm twin flange.
- **Fringe Sport 20 kg Axle** — [fringesport.com/products/onefitwonder-axle-bar-20-kg](https://www.fringesport.com/products/onefitwonder-axle-bar-20-kg). 7 ft, 50 mm shaft, 49 mm sleeves, 15.5" loadable, unknurled matte black, non-rotating. 12 photos. *Estimated*: collar Ø66 × 16.
- **Fringe Sport Stubby Axle** — [fringesport.com/products/short-axle-barbell](https://www.fringesport.com/products/short-axle-barbell). 70.75", 2" throughout, 9" sleeves; yellow ring marks and gold end badges from photos. 10 photos. *Estimated*: ring positions (150/235/320/400 mm from centre), collar.

## Curl bars

| Product | Length | Between sleeves | Sleeve | Shaft | Source |
|---|---|---|---|---|---|
| Rogue Curl Bar | 54.5" | 31.5" | 10.5" | 28.5 mm | [roguefitness.com/rogue-curl-bar](https://www.roguefitness.com/rogue-curl-bar) (11 photos incl. spec drawing, stainless and Cerakote variants) |
| Rogue Rackable Curl Bar | 74.75" | 51.8125" | 10.5" | 28.5 mm | [roguefitness.com/rogue-rackable-curl-bar](https://www.roguefitness.com/rogue-rackable-curl-bar) (12 photos incl. spec drawing) |
| REP Rackable Curl Bar | 74" | 51" | 10" | 30 mm | [repfitness.com/products/rackable-curl-bar](https://repfitness.com/products/rackable-curl-bar) (9 photos) |
| CAP 47" Olympic EZ | 1200 mm | 32" | 7.5" | 25.4 mm | [capbarbell.com 47" Olympic curl bar](https://capbarbell.com/products/cap-barbell-47-inch-olympic-solid-curl-bar-black-1), [Iron Company OBB-47](https://www.ironcompany.com/cap-barbell-economy-olympic-ez-curl-bar) (12 photos) |
| BoS EZ Curl Bar 45" | 1143 mm | est. 752 mm | 7" | 28 mm | [bellsofsteel.com/products/ez-curl-bar-45](https://bellsofsteel.com/products/ez-curl-bar-45) (8 photos) |

Finishes: Rogue black E-coat / Cerakote / stainless with bright zinc sleeves and bronze bushings; REP hard chrome or
stainless; CAP chrome or black with chrome sleeves; BoS black phosphate with machined (ribbed) nickel sleeves.
Collar widths are derived so length = between + 2 × (collar + sleeve). *Estimated*: bend offsets (±34–45 mm), bend
radii, flat run lengths and collar diameters, read off the spec drawings and top-down photos.

## Trap bars

- **REP Open Trap Bar** — [repfitness.com/products/open-trap-bar](https://repfitness.com/products/open-trap-bar). Tech specs: 84.3" length, 50.5" collar to collar, 33.1" frame interior, 16.5" sleeves, handle widths 23/25/27.3" (Narrow/Standard/Wide param; the 24.6" rotating set is not modelled), in-line handles 8.3" and high handles 11.3" floor-to-centre loaded, 6" frame knurl. 16 photos. *Estimated*: 1.75" frame tube, 430 mm U height, 240 mm jack axis height, bracket plates, foot pads.
- **Kabuki Strength Trap Bar HD** — [Strength Shop listing](https://www.strengthshop.co.uk/products/kabuki-strength-the-trap-bar-hd) (kabukistrength.net did not resolve). 195.58 cm length, 43.18 cm sleeves, 29 mm handles, 58.42/63.5/68.58 cm handle spacing (param), low 24.77 cm and high 32.39 cm loaded handle heights, clear zinc sleeves. 9 photos. *Estimated*: 2 × 1" rectangular tube frame with inward-leaning legs, 330 mm U height.
- **Giant Lifting Northland** — [giantlifting.com/products/giant-northland-open-trap-hex-bar](https://giantlifting.com/products/giant-northland-open-trap-hex-bar), [GGR review](https://www.garagegymreviews.com/giant-open-hex-trap-bar-review). Dual 28 mm handles 25" apart, 16" or 10" sleeves (param), built-in jack on solid steel T feet, metallic black. 14 photos. *Estimated*: overall length (2116 mm with 16" sleeves), frame, gussets and handle heights; Giant publishes no dimension table.
- **Bells of Steel Open Trap Bar** — [bellsofsteel.com/products/open-trap-bar-hex-bar](https://bellsofsteel.com/products/open-trap-bar-hex-bar). Dimension drawing: 1500 mm length, 381 mm top, 400 mm diagonals, 600 mm between handles, 420 mm between feet, 247 mm sleeves, 25 mm handles; white zinc sleeves, black oxide knurled handles. 9 photos. *Estimated*: 32 mm frame tube, loop handle heights (−10/+80 mm), 47° legs.
- **Rogue TB-2** — [roguefitness.com/rogue-tb-2-trap-bar](https://www.roguefitness.com/rogue-tb-2-trap-bar), [BarBend review](https://barbend.com/rogue-tb-2-trap-bar-review/). 88.5 × 28.5 × 9", 1.5" square tube, 1.34" handles 25" on centre, raised handles 8.25" off the floor, flush handles by flipping, 1.91" × 16" black SCH 80 sleeves. 8 photos. *Estimated*: hexagon corner points, 1244 mm frame length, gussets.

## Multi-grip bars

- **Kabuki Kadillac Bar** — [roguefitness.com/kabuki-kadillac-bars](https://www.roguefitness.com/kabuki-kadillac-bars), [Strength Shop](https://www.strengthshop.co.uk/products/kabuki-strength-the-kadillac-bar). 221 cm, 17.78 cm width, 42.55 cm sleeves, rack fit 40.5–52.5" (frame length and collar spacing), 1.33" handles spaced 15.3/22.3/29.2" at 10/12.5/15°, bright zinc or matte black sleeves (param). 18 photos. *Estimated*: ½" × 66 mm plates, 85 mm arch rise (front rack photo), X brace, flange.
- **REP Cambered Swiss Bar** — [repfitness.com/products/cambered-swiss-multi-grip-barbell](https://repfitness.com/products/cambered-swiss-multi-grip-barbell). 80.7", 14.03" sleeves, 2.5" camber, 35 mm handles, 50 mm hard-chrome sleeves, removable eyebolt, round tube. 14 photos. *Estimated*: 960 mm frame, 236 mm ladder width, handle stations ±130/±250/±425 mm (outer pair at sleeve level = "deficit"), 76 mm twin bracket plates.
- **Rogue MG-4CN** — [roguefitness.com/rogue-mg-4cn-narrow-multi-grip-camber-bar](https://www.roguefitness.com/rogue-mg-4cn-narrow-multi-grip-camber-bar). 83.8"/70.8" (15.5"/9" sleeves param), 51.5" between sleeves, 41" rackable span, 7.1" outside / 5" inside, 1 × 2" 11-gauge tube, 3.5" camber, 1" hole pitch, 5" × 32 mm handles at 12° and 16°, 6–26" spacing (two params), matte black or stainless handles/sleeves (param). 17 photos. *Estimated*: ramp start (185 mm) from the front rack photo, hex lock nut, end block; the chamfered frame corners in plan are not modelled.
- **Bells of Steel Arch Nemesis** — [bellsofsteel.com/products/arch-nemesis-swiss-bar](https://bellsofsteel.com/products/arch-nemesis-swiss-bar), [GGR](https://www.garagegymreviews.com/arch-nemesis-swiss-bar-review). 78.1", 7.5" wide, 5.5" deep, 49.7 mm non-rotating sleeves, 32 mm grips at 12/20.5/29", top cable hook, gloss black. 9 photos. *Estimated*: 1090 mm frame, 10 × 50 mm plates, 18° grip angle, collar position.
- **Titan Fitness Multi-Grip Barbell (V3)** — [titan.fitness/products/multi-grip-barbell-v3](https://titan.fitness/products/multi-grip-barbell-v3). The Gym Radar "Titan Fitness Multi-Grip Barbell" owner reviews compare it unfavourably to cambered bars, so this is the flat V3, not the Multi-Grip Camber Bar. 82", 39.5 × 10.25 × 1.5" frame, 53" sleeve to sleeve, 48 mm sleeves, 32 mm × 7" grips, 30° pair 10" apart, neutral 20" and 29". The published 82" and 14.5" sleeves overlap by 11 mm, so the loadable sleeve is 14.1". 9 photos. *Estimated*: end chamfers, badge.

No source meshes or logo artwork are embedded; logos are flat plates (Rogue TB-2 white plate, Titan steel badge, BoS
and MG-4CN plates). Knurl is a separate darker solid on grips only.
