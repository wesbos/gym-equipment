# Specialty squat bars (#108)

Sources checked 2026-09-19. Popularity counts are Gym Radar owner counts from `docs/equipment-catalog.md` and the issue. Every product was checked against at least 8 photos from the manufacturer gallery, retailer galleries and owner photos on gymradar.com / garagegymreviews.com.

## How the models are built

Each product is a list of ideal prims in `floor-parts/specialty-bars.ts` (geometry helpers in `floor-parts/specialty-bars-geometry.ts`). A prim is either a planar section swept along a path (straight rods, S-cambers, bows, bent handles, chain links, pad blocks and arms) or the convex hull of a point set (the ACG's sheared frame tubes and the Transformer's bracket plates). Every prim has an exact support function, so the metadata can compute the following from the same geometry that `parts/specialty-bars.ts` meshes, without Manifold:

- **Floor pose.** Take the roll θ about the bar axis at which the centre of mass sits lowest above the bar's lowest point. That is a stable rest on a flat floor. Among the stable rests, the model's preferred roll wins: SSBs and the CB-1 have camber and handles lying towards the front, with pad logos facing up; bowed bars have the bow lying flat towards the front; the ACG sits upright on its dropped centre. The pose then lifts the bar so its lowest point touches z = 0. The SSBs rest on their pad and handle ends with the sleeves a little off the floor. Bowed bars rest on their collars and the bow apex. The CB-1 rests on its top bar and sleeves.
- **Shaft axis.** The straight rackable section (SSB shaft, CB-1 top bar, ACG shaft, or the sleeve axis for bowed bars) always sits on local Y = 0, at `specialtyBarPose(...).axisZ`. That is the line rack cradles hold.
- **Footprint.** The footprint is the posed X/Y bounds, with an `offset` because the shaft axis is not the footprint centre.

Mesh vertices lie on or inside the ideal surfaces, so the built bounds come within about 0.3 mm of the footprint and never go below the floor. The tests check this.

**Parking.** Each entry declares a `bar` spec (`specialtyBarSpec`, the #139 contract): the rackable section's diameter and half-length, the loadable sleeves read from the same prims, and the floor-pose axis height. A parked bar's shaft therefore rests on the cup floor at its real radius and keeps its floor roll, so SSB handles and cambers point towards the rack front. Bars whose sleeves sit off the shaft axis (the S-camber SSBs, the CB-1 legs and every Transformer camber and slot setting) also declare a `sleeveOffset` (#149): the sleeve axis position relative to the shaft axis, read from the sleeve prim and rotated into the floor roll. The bar keeps that roll when parked, so `barSleeves` puts plate stacks on the real sleeves, both parked and on the floor. The bowed bars' sleeves are the rackable axis, so they declare no offset.

## Titan Fitness Safety Squat Bar (162)

- [titan.fitness/products/safety-squat-olympic-bar](https://titan.fitness/products/safety-squat-olympic-bar) (SKU 430410; 10 gallery images including the dimension drawing), [Garage Gym Lab review](https://garagegymlab.com/titan-fitness-safety-squat-bar-v2-review/).
- Published: 90.5" long, 50" rackable, 14.75" loadable sleeves, 38 mm shaft, 50 mm sleeves, 35 mm rubber handles 12.75" apart, 5" handle grips, 5" drop, 20° camber, 58 lb, 1,500 lb. Chrome shaft and sleeves, black HeftyGrip pad with the Titan icon (orange-red) and wordmark on the front face.
- Estimated: pad 18" × 135 × 140 mm (photo-scaled from the drawing), arms 127 mm wide × 118 mm deep with 8" between them, arm length 282 mm below the shaft, logo plates sized from the front studio shot (icon about 42 mm, wordmark 180 mm), 8° forward tilt, bend radius 30 mm. The camber plane is tilted 20° forward, with a 5" vertical drop. Red end caps from the gallery.

## EliteFTS SS Yoke Bar (127)

- [elitefts.com/products/ss-yoke-bar](https://elitefts.com/products/ss-yoke-bar) (5 images), [elitefts.co.uk](https://www.elitefts.co.uk/products/ss-yoke-bar) (9 images including chrome-sleeve and in-rack shots), [Garage Gym Products](https://garagegymproducts.com/elitefts-ss-yoke-bar/).
- Published: 92" long, 49.5" (128 cm) between cambers, pads "close to 9 in" apart on the inside, 7" detachable knurled handles, non-rotating sleeves, black or clear finish (variants), 65 lb. Reviews give a 6" drop and a camber about 30° to the body.
- Estimated: neck pad 18" × 150 × 170 mm with 45 mm rounded edges and "SS YOKE" on top; round arm pads 110 mm across, reaching 310 mm below the shaft (scaled from the 7" handles), 20° forward; sleeves 49.5 mm × 14.5" (photo-scaled; EliteFTS notes spring collars do not fit); welded 66 mm collar ring; four raised grip rings per handle.

## REP Fitness Safety Squat Bar (108)

- [repfitness.com/products/safety-squat-bar](https://repfitness.com/products/safety-squat-bar) (BB-4600; 9 studio and in-use images, technical specifications table).
- Published: 92.5" long, 15.6" sleeves, 2" sleeve diameter, 7" × 1.5" handles 13" apart, 49.1" between cambers, 5.5" camber drop, pads 8.3" apart, metallic black powder-coat shaft, hard-chrome sleeves, bright-chrome handles, high-density foam and vinyl pad, 68 lb.
- Estimated: 32 mm shaft (photo ratio to the 2" sleeve), pad 432 × 125 × 132 mm with a flat front face carrying the white REP mark, arm pads reaching 330 mm below the shaft (scaled from the 7" handles in the in-rack photo), 25° camber tilt, bend radius 36 mm.

## Kabuki Strength Transformer Bar (98)

- [roguefitness.com/rogue-kabuki-transformer-bar](https://www.roguefitness.com/rogue-kabuki-transformer-bar) (made by Rogue; 5 studio images), 12 owner photos on [Gym Radar](https://gymradar.com/equipment/kabuki-transformer-bar), [Garage Gym Reviews](https://www.garagegymreviews.com/kabuki-strength-transformer-bar-review).
- Published: 91.25" long, 54" between brackets, 25 kg, 15.75" loadable machined, grooved, matte black sleeves, 1.15" knurled handles 12" apart (short and standard handles included), black powder-coat centre bar, 6 camber positions 30° apart × 4 sleeve slots (Easy 1 → Hard 4) = 24 settings.
- Params: camber position, sleeve slot, handles.
- Estimated: the absolute camber angles (−60° to +90° from straight down; the default is the studio front view setting, 0° with slot 4); slot radii 100/130/160/190 mm (slot 4 matches the ~7.5" drop in the front view); bracket plate 16 mm thick and 62/48 mm end radii; indexing hub 140 mm across. The pad (483 × 105 mm), arm reach (210 mm) and standard handles (about 320 mm) are scaled from the 12" handle spacing in the studio front view. The 60° bend on the short handles is estimated.

## Bells of Steel SS4 Safety Squat Bar (59)

- [bellsofsteel.us/products/safety-squat-bar-ss4](https://bellsofsteel.us/products/safety-squat-bar-ss4) (17 images including the spec graphic, each handle accessory and the needle-bearing close-up), [The Jungle Gym Reviews](https://www.thejunglegymreviews.com/reviews/bells-of-steel-ss4-review).
- Published: 86 5/8" (2200 mm) long, 11 13/16" loadable sleeves, 1 1/4" (32 mm) shaft, 21" deep from the pad back to the handle ends, 5" pad, 9" between shoulder pads, 7.25" usable straight handles, 22° camber, black titanium shaft and sleeves, needle bearings, 45.6 lb, 1,500 lb.
- Params: handles. The options are straight (included), spider, seal row and chain handles, which all thread onto the same posts.
- Estimated: 48" between cambers (photo-scaled from the spec graphic), 3.5" drop, arm size, and arm reach (265 mm below the shaft, chosen so the pad back to handle tip matches the published 21"), handle-accessory lengths and bends, and a bronze bearing seal ring by each collar.

## Kabuki Strength Duffalo Bar (56)

- Kabuki's store is offline. Sources: the archived product page ([web.archive.org, 2024-03-15](http://web.archive.org/web/20240315124501/https://kabukistrength.com/products/duffalo-performance-squat-bar)), 4 archived product images, and 15 photos from the [Garage Gym Reviews in-depth review](https://www.garagegymreviews.com/kabuki-strength-duffalo-bar-in-depth-review) (floor, rack, knurl, sleeve and end-cap close-ups).
- Published (Kabuki technical specs): 95" long, 31.75 mm (1.25") diameter, 17.25" loadable sleeves, zinc, black oxide or nickel finish, sharp knurl, oil-impregnated bronze bushings, stamped stainless end cap, 55 lb. Garage Gym Reviews lists an older 96"/30 mm/19.5" spec; Kabuki's own page wins.
- Params: finish.
- Estimated: a 3.25" camber over a 700 mm half-width. The bend starts just inside the collars, from rack and floor photos. The real bend is "multiple radius", and we approximate it with a drop·(1 − u²)² profile, which is tighter by the collars and flatter through the middle. The CB-4 uses a single raised-cosine bend. Knurl is segmented into 80 mm bands with 12 mm smooth rings, from the floor photo.

## EliteFTS American Cambered Grip Bar (47)

- [elitefts.com/products/american-cambered-grip-bar](https://elitefts.com/products/american-cambered-grip-bar) (7 images including top, side and close-up), 10 owner photos on [Gym Radar](https://gymradar.com/equipment/american-cambered-grip-bar).
- Published: 38 lb, handle spacing 7.5", 15", 21.5" and 28" on centre, rackable 39.5"–50.5". It is a cambered multi-grip press bar, and it can be flipped for overload pressing.
- Estimated: 80" overall and a 39.5" frame (photo-scaled from the side view; the frame length matches the minimum rackable space); frame 215 mm deep with 22 mm chamfered end corners (straight-down studio shot); 25 × 38 mm rails; 2" camber (owner review) over a 300 mm flat centre with 50 mm slopes; 32 mm grips slanted 14°; 32 mm shaft stubs; 50 mm sleeves; white EliteFTS mark on the back rail.

## Rogue CB-4 38MM Camber Bar (the "Buffalo bar")

- [roguefitness.com/rogue-cb-4-38mm-camber-bar](https://www.roguefitness.com/rogue-cb-4-38mm-camber-bar) (5 studio images: bar in rack, end cap, sleeve and knurl), 9 owner photos on [Gym Radar](https://gymradar.com/equipment/rogue-cb-4-38mm-camber-bar), [Garage Gym Reviews](https://www.garagegymreviews.com/rogue-cb4-buffalo-bar-review).
- Published: 95" long, 38 mm, 16" loadable sleeves, 9" extra between sleeves, 4.4" drop over a 55" wide bend, sharp power knurl plus centre knurl, black Cerakote shaft, proprietary matte black sleeves, 60 lb.
- Estimated: raised-cosine bend profile, knurl zones (centre ±80 mm, power 110–560 mm), 25 mm collars, and a white badge on the black end cap.

## Rogue CB-1 Camber Bar (the cambered squat bar)

- [roguefitness.com/cb-1-rogue-camber-bar](https://www.roguefitness.com/cb-1-rogue-camber-bar) (3 studio images, including a straight-on rack shot), [Rogue blog](https://blog.roguefitness.com/2012/01/rogue-cb-1-camber-bar/), 9 owner photos on [Gym Radar](https://gymradar.com/equipment/cb-1-rogue-camber-bar), [A Barbell Story review](https://abarbellstory.com/2022/08/30/equipment-review-cb-1-rogue-cambered-bar/) (weight hangs about 14" below the chest).
- Published: 85 lb, 1.5" formed solid steel shaft, machined Olympic sleeves, fully welded, rackable.
- Estimated from the straight-on studio rack shot, scaled to the rack's upright spacing: 92" overall, 66" top bar, legs 447 mm from centre at the top splaying to 480 mm, a 16.5" centre-to-centre drop, 50 mm sleeves.
- The issue says "Cambered Squat Bar / Spider Bar". Rogue sells no Spider Bar; the Cambered Spider Bar is an EliteFTS product. This entry is the Rogue CB-1 only.
