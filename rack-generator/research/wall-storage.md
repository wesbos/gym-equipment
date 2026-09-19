# Wall storage reconstruction (#128)

Fourteen wall-mounted storage products, highest-owned first (Gym Radar counts, Sep 2026). Sources checked 2026-09-19.
Metadata and every published/estimated number live in `wall-parts/wall-storage.ts`; builders in `parts/wall-storage.ts`
with the shared kit (bar, change plates, med balls, profile extrusions) in `parts/wall-storage-kit.ts`.

Axes: X along the wall, −Y out of it (d = distance from the wall), Z up; origin at the face centre on the wall surface.
Every face reserves the fully loaded envelope, so changing `loaded` never moves an item on the wall. Floor-standing holders
(the two 9-bar units) are wall items parked on the floor against the wall: their suggested height is half the face.

Stored loads: a low-poly men's 20 kg bar built from the `BAR` constants (28.5 mm shaft with IWF/IPF knurl bands, 56 mm
collars, 50 mm sleeves, alternating hard chrome / black oxide); table plates through `buildPlateStack`; 5 lb and 2.5 lb
iron change plates (200 × 23 mm and 165 × 19 mm, estimated standard Olympic change plates) as local revolves because the
shared plate table stops at 10 lb; 14″ vinyl medicine balls (Rogue med ball diameter).

Logos (Rogue stencil lettering, REP/BoS/SDS badges) are plain flat badges — no logo artwork is copied.

## 1. Wall Control slotted metal pegboard (252) — `wall-control-pegboard`

Sources: [32″ × 16″ panel](https://wallcontrol.com/products/32in-x-16in-metal-pegboard-tool-board-panel),
[16″ × 32″ horizontal](https://wallcontrol.com/products/16in-x-32in-horizontal-metal-pegboard-tool-board-panel),
[how-to / FAQ](https://www.wallcontrol.com/pegboard-how-to), Zoro/Grainger listings (1″ slots, 1/4″ holes, 1″ spacing, 3/4″ D).
Photos looked at (11): black front, purple feature graphic (grid), white flange close-up, blue side, galvanized ¼″-peg and
slotted-hook close-ups, stud-spacing wall, red/galvanized singles, horizontal feature graphic.

Published: 16 × 32 in, 20 ga steel, 1/4″ holes and slots on 1″ centres, 3/4″ formed flush-with-wall flange, 16″ stud spacing,
colours Black, Galvanized/Metallic, White, Red, Blue, Gray, Green, Orange, Yellow, Beige, Purple, Pink, Gold.

Measured from the purple 32 × 16 graphic by pixel profile: dot columns at 1…15″ from the left edge (15), slot columns at
1.5…14.5″ (14); dot rows at every inch 1…31″, slot rows on the odd inches (16), slot length 0.94″ (modelled 15/16″),
slot width 1/8″ (estimate). Mounting holes at the corners, 0.45″ inboard, plus the 16″ stud line (6 per 32 × 16 panel).
Hook slots for hang items are the real slot centres: every slot column, every other slot row from the top (4″ rows).
Params: size (32 × 16 vertical, 16 × 32 horizontal, 48 × 16), 1–4 panels butted side by side (1–3 for 48″, triangle budget),
colour. Estimates: hem width 1/2″, 5/16″ mounting holes with pan-head screws.

## 2. Rogue Belt & Band Hanger (65) — `rogue-belt-band-hanger` · 12. Rogue Multi-Use Hanger (20) — `rogue-multi-use-hanger`

Sources: [Belt & Band Hanger](https://www.roguefitness.com/belt-and-band-hanger), [Multi-Use Hanger](https://www.roguefitness.com/multi-use-hanger).
Photos (7 across both, same panel): loaded front, bare iso, 5″/8″ comparison ×2, multi loaded front/iso, multi bare iso.
Published: 23.5″ × 4″ panel, laser-cut 11 ga, 10 × 1″ prongs (belt) or 6 × 2″ prongs (multi), 5″ or 8″ depth,
3/8″ holes 22.5″ c-c × 2.5″ vertical (Rogue also cites a 16″ option — modelled as a second hole set).
Estimates: prong pitch = width / count, 16 mm tip kick at 30°, 3 mm corner radius, badge size for the ROGUE lettering.
Fewer than 8 distinct photos exist for these two (Rogue gallery only); the shared panel is covered by 7 images.

## 3/6. Rogue V2 Gun Rack (50) and 3 Bar Gun Rack (31) — `rogue-v2-gun-rack`, `rogue-3-bar-gun-rack`

Sources: [V2 Gun Rack](https://www.roguefitness.com/the-rogue-gun-rack), [3 Bar Gun Rack](https://www.roguefitness.com/rogue-3-bar-gun-rack).
Photos (10): V2 front loaded, colour-bar close-up, iso loaded, cradle close-up with collar, dark iso; 3-bar front, cradle close-ups ×3, bare pair.
Published: V2 31.75″ tall, 5″ deep, 1.75″ flange, 7 ga (0.1793″), 6 bars, optional UHMW inserts; 3-bar 17″ bracket,
5″ depth, 3/8″ holes. Estimates: rung pitch 134 mm (photo: first/last bar 42 %/58 % of the spare height from the ends),
28 mm arm, 26 mm lip, 26 mm notch radius 54 mm from the wall (round 1: moved in from 76 mm to match the cradle close-up), 16 mm tip chamfer, 26 mm gusset, 3/8″ UHMW insert. Bracket spacing param
40/46/60″ (46″ ≈ the photo spacing and REP's recommendation; 60″ rests the bars on their sleeves).

## 4. Rogue Vertical Bar Hanger (48) — `rogue-vertical-bar-hanger`

Source: [Vertical Bar Hanger](https://www.roguefitness.com/vertical-bar-hanger). Photos (6): wall-mount triple front, rack
mount scenes ×2, triple loaded close-up, UHMW tip close-ups ×2.
Published: single 6″ / triple 12″, 4.25″ depth, 3″ height, 3/16″ formed steel, UHMW layer, wall holes 4″ c-c (single)
and 10″ × 1.25″ (triple). Estimates: 35 mm slot, 3.5″ slot pitch, bar axis 58 mm from the wall, 1/4″ UHMW top,
22 mm UHMW tip blocks. Bars hang sleeve-up from the collar; the face spans the 2.2 m bars and the suggested height
leaves the bar ends 25 mm off the floor.

## 5. Rogue 9 Bar Holder 2.0 (42) — `rogue-9-bar-holder` · 13. REP 9-Bar Storage (20) — `rep-9-bar-storage`

Sources: [Rogue 9 Bar Holder 2.0](https://www.roguefitness.com/rogue-9-bar-holder-2-0), [REP 9-Bar Storage](https://repfitness.com/products/9-bar-storage).
Both are floor-standing (listed in #128); modelled as wall items parked on the floor against the wall.
Photos: Rogue 5 (front loaded ×2, iso, logo close-up, open side), REP 1 (the only published image).
Published: Rogue 18 × 18 × 8.5″, 59.3 lb, 7 ga sheets, nine 7″ long × 2″ ID DOM tubes, matte black textured; REP 18 × 18 × 7.5″,
40 lb, 7 ga, black powder coat, plastic-lined "extra tall" tubes, laser-cut logo.
Estimates: Rogue top sheet 7.75″, tube OD 2.375″, 5.4″ grid, lower sheet 1.5″ up; REP top 6.6″, tube 2.5″ OD / 2.12″ ID,
6″ grid, lower sheet 1″ up; 45 mm foot reliefs. Bars stand sleeve-first on the lower sheet, front row first.

## 7. REP Wall Mounted Plate Storage (31) — `rep-wall-mounted-plate-storage`

Source: [Wall Mounted Plate Storage](https://repfitness.com/products/wall-mounted-plate-storage). Photos (12): single and
double iso, pair front, garage wall scenes ×6, loaded change plates, loaded bumpers.
Published: 8.25″ horn, single (full-size plates) and double (change plates), stud mount with four lag screws.
Estimates: plate 2.5″ × 16″ × 1/4″, horn 1.9″ OD, double horns 9″ c-c, 2 × 2 hole pattern per end.
Loads: 2 × 25 kg bumpers or 4 × 45 lb iron (single); 5 + 2.5 lb pairs above a 10 lb pair (double).

## 8. Titan Wall Mounted 6 Barbell Rack (30) — `titan-wall-mounted-6-barbell-rack`

Sources: [Titan product](https://titan.fitness/products/wall-mounted-6-barbell-rack), [Amazon B08R11DZ1M](https://www.amazon.com/dp/B08R11DZ1M).
Photos (10): pair iso, 32″ dimension shot, 12-bar wall scene ×2, hook close-ups ×4, spec card.
Published: 32″ tall, 5.4″ deep, six bars, 400 lb, 21 lb, fully lined UHMW (V2). Estimates: 2″ flange, 3/16″ steel,
hook profile (30 mm notch 66 mm from the wall, 34 mm lip, 14 mm chamfer), 1/4″ UHMW plates on both faces.

## 9. Bells of Steel Change Plate Storage Pegs (22) — `bells-of-steel-change-plate-pegs`

Source: [Change Plate Storage Pegs](https://bellsofsteel.us/products/change-plate-pegs) (US and CA stores, same gallery).
Photos: 2 official (front, iso) — no other galleries found; noted as a sourcing gap.
Published: 8″ loadable sleeves, three pegs (two on top) welded at an upward angle, two-bolt mounting, Hydra 5/8″ or
Manticore 1″ holes; Manticore adds UHMW upright protection and rubber stoppers. Estimates: 9″ peg span and drop (photo
ratio to the 1.9″ peg), 5° tilt, 2.5″ stem, bolt holes 2.1″/6″ below the peg line, stopper rings 72 mm OD × 14 mm.

## 10. REP Gun Rack Barbell Storage (21) — `rep-gun-rack-barbell-storage`

Sources: [REP product](https://repfitness.com/products/gun-rack-barbell-storage), [Amazon B07BWRTDQ9](https://www.amazon.com/dp/B07BWRTDQ9).
Photos (9): 3-bar and 8-bar pairs (REP), Amazon: pair, spec card, three customer installs, 8-bar pair.
Published: 21.7″ (3 bar) / 53.1″ (8 bar) long, 5.5″ deep, 2.5″ wide, 6 ga steel, matte black, plastic liners, 46″ spacing.
Estimates: 165 mm cradle pitch, C cradle (30 mm notch 72 mm from the wall, 42 mm lip, 34 mm curved gusset), 3 mm liner band.

## 11. Stray Dog Strength Change Plate Storage (20) — `stray-dog-change-plate-storage`

Source: [Change Plate Storage](https://straydogstrength.com/products/change-plate-storage). Photos (14) incl. the
published dimension drawing (`2013-SIZE.png`).
Published (drawing): top pegs 9″ c-c, bottom peg 9″ below, 6″ pegs at 87° (3° up), 4″ between the two holes,
2″ storage tabs; single bolt, 1″ or 5/8″ versions. Scaled from the drawing: 1.9″ pegs, 1.4″ lobes, 2″ stem,
tabs at ±1.9″ and ±3.7″, 20° tab bend.

## 14. Rogue Wall Mount Swiss Brackets (wall ball / band / rope storage) — `rogue-wall-mount-swiss-brackets`

Source: [Wall Mount Swiss Brackets](https://www.roguefitness.com/rogue-wall-mount-swiss-brackets). Photos (6): bare iso ×2,
two loaded rows ×2, bare wall iso, four-ball close-up. Chosen as Rogue's wall-mounted ball storage.
Published: 15.5″ reach, 8″ × 2.5″ bracket, 3/16″ laser-cut steel, pair with four shaft collars and two 52″ pipes.
Estimates: pipes (3/4″ NPS, 1.05″ OD) 150/372 mm from the wall, 32″ bracket spacing (24/32/40″ param), lightening holes,
14″ balls resting on both pipes (up to four).

## Sourcing gaps

Fewer than eight distinct photos exist publicly for: BoS change plate pegs (2), REP 9-Bar Storage (1), the Rogue 9 Bar
Holder (5), Rogue Swiss Brackets (6), Vertical Bar Hanger (6) and the Rogue hangers (3–4 each). Where a product had few
photos, dimensions lean on the published specs and the proportions of sibling products.
