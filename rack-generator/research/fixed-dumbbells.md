# Fixed & loadable dumbbells (issue #110)

Sources checked 2026-09-19. Every entry is one catalog part (`floor-parts/fixed-dumbbells.ts`), built by one of six shared
builders in `parts/fixed-dumbbells.ts`: hex, urethane round, pro-style plates, York cast heads, Fatbell and loadable
handle. Each entry's params resolve to a plain `DumbbellShape` in millimetres; the footprint and the solids come from the
same shape, so they cannot drift. The per-weight tables live in the metadata file next to the entry, with the source of
each column in its doc comment. Weight numbers and brand names are typeset in the bundled Helvetiker Bold (no logo
artwork). Reference photos were downloaded and reviewed (8–19 per product); the photo lists below say what each set shows.

Frame: the dumbbell lies on the floor with the handle along Y (floor depth), heads resting on a flat (hex) or rim
(round), origin at the footprint centre. `pair: { gap: 60 }` sets the second of a pair beside the first.

Hex convention: retailer "L × W × H" is overall length × across corners × across flats. CAP's 15 lb end-view graphic
(3.94" flats, 4.53" corners, 11.34" long) matches Walmart's listing exactly; corners = flats / 0.866. Heads rest on a flat
with the corners left and right, as in CAP's and Amazon's end views (the mould seam runs corner to corner).

## CAP Barbell rubber hex (SDR / SDRIS chrome / SDRBIS black) — `cap-rubber-hex-dumbbell`
- https://capbarbell.com/products/cap-barbell-rubber-hex-dumbbell-pair, https://capbarbell.com/products/cap-rubber-hex-dumbbell,
  Walmart https://www.walmart.com/ip/27142374 (per-weight L × W × H for all 27 sizes), Amazon B07TB5DD3J.
- Weights 3, 5, 8, 10, 12, 15, 20–120 lb (27). Handle chrome or black oxide (param).
- Published: L/corners/flats for every weight; CAP graphics give 5.04" exposed handle and Ø 1.25" (15–40 lb), 1.28" (45),
  1.6" (75/80). Head length = (L − 5.04")/2, checked against pixel measurements (±0.15").
- Selected rows (in, L / corners / flats): 3: 8.75/2.60/2.25 · 15: 11.34/4.53/3.94 · 40: 13.62/6.38/5.51 · 80: 16.10/8.20/7.10 · 120: 17.64/9.20/8.00.
- Estimates: Ø between graphics; 55 lb and 105–120 lb retailer values repeat, so they are smoothed; ergo contour (bulged
  knurled centre, smooth necks, two narrow knurl rings) to 45 lb, straighter thicker handle from 50 lb.
- Labels: raised numerals (no LB) in a recessed panel on the top flat, reading along the handle, same black rubber.
- Photos (14): 5/25/50/100 lb chrome 3/4 views, 25 lb black handle, end face with seam, CAP dimension graphics (15, 40, 75, 80 lb), feature callouts, 3–120 lineup.

## CAP Barbell cast iron hex, black (SDB2) — `cap-cast-iron-hex-dumbbell`
- https://capbarbell.com/products/cap-cast-iron-hex-dumbbell-black (per-weight dimension graphic), Amazon B0C5RXXT74.
- Weights 5, 8, 10, 12, 15, 20–120 lb. Published per weight: overall length, head height (corners), handle Ø (1.16"
  to 45 lb … 1.25" from 95 lb); 5.08" between heads on every graphic.
- Selected rows (in, L / corners): 5: 8.58/2.64 · 20: 10.98/4.57 · 60: 14.09/6.69 · 100: 15.51/7.95 · 120: 16.14/8.43.
- Estimates: 30/35/50/55 lb interpolated; chamfers. One-piece cast handle to 15 lb, knurled black steel from 20 lb.
- Labels: raised silver numerals inside a raised silver frame on the top flat (modelled as a silver solid).
- Photos (19): set on rack, 12/15/20/25/30/40/50/60 lb 3/4 views, end face, dimension graphics 5/12/20/60/100/120 lb.

## Rogue rubber hex — `rogue-rubber-hex-dumbbell`
- https://www.roguefitness.com/rogue-dumbbells; BarBend and OutdoorGearLab reviews. Weights 2.5–30 (2.5 steps), 35–125 (5).
- Published only: handle Ø 25 mm to 10 lb, 35 mm from 12.5 lb; "handles around 5 inches". No per-weight head sizes
  (Rogue's product guide returned 403).
- Estimate (±10–15 %): each head carries the REP photo-measured head volume at that weight, reshaped to Rogue's longer
  heads (length ≈ 0.9 × flats, from the front-on 100 lb photo) on a 130 mm grip.
- Contoured chrome handle: centre knurl band ≈ 36 mm, smooth gap, narrow ≈ 10 mm ring each side, smooth flare into the head (macro photo).
- Labels: smooth satin panel (reads lighter than the stippled rubber) with raised ROGUE on one head and the weight on the other, reading along the handle.
- Photos (14): product shot of 50/20 lb, label macro, knurl macro, floor shot, 10 athlete shots (end faces, bevels).

## REP Fitness rubber hex — `rep-hex-dumbbell`
- https://repfitness.com/products/rubber-hex-dumbbell-pairs (+ .json); BarBend (50 lb ≈ 4.9" × 6"), Garage Gym Reviews.
- Weights 2.5–30 (2.5), 35–125 (5). Published: 5.2" grip; 28 mm (2.5–15 lb) / 34 mm (17.5–125 lb); straight, fully knurled.
- Head sizes photo-measured from REP's 31 upright per-weight photos, scaled by the 132 mm grip (the measured handle came
  out 27–28 / 33–35 mm, confirming scale), ±5 %. 7.5/12.5/17.5/22.5 and 105–125 lb reuse other weights' photos, so they are interpolated.
- Bevel ≈ 18 % of head length on both ends (end face ≈ 0.67 × full size). Recessed square panel with raised REP / weight,
  text reading across the flat (upright when the dumbbell stands, as in REP's photos).
- Photos (17 + 31 per-weight): upright pairs 2.5–125, 50 lb on floor, rack close-ups of panels, bevels and knurl.

## Amazon Basics rubber encased hex — `amazon-basics-rubber-hex-dumbbell`
- https://www.amazon.com/dp/B0DKNNNH6X and variants B074DZ5YL9 … B074DZ6NJB; cm graphic 27.5 × 10.5 × 8.9 cm (10 lb); 40 lb bundle title 14 × 6.3 × 5.5".
- Weights 10–50 lb (10–45 listed, 50 in the size chart). L × corners per variant (in): 10: 10.7×4.0 · 20: 12.1×4.9 · 30: 12.9×5.6 · 45: 14.2×6.5.
- Estimates: 4.8" exposed handle (photo-measured on 25/30/40 lb side graphics); 50 lb row extrapolated; contour and collars.
- Labels: raised "10LB" style text in a recessed panel on the top flat.
- Photos (14): 10/20/45 lb 3/4 views, end faces, size chart, dimension graphics, lifestyle.

## Body-Solid cast iron hex (SDX) — `body-solid-cast-iron-hex-dumbbell`
- https://bodysolid.com/hex-dumbbells, data sheet https://bodysolid.com/content/SDX_PDS.pdf, selectfitness.com, usasportsoutlet.com.
- Weights 3, 5, 8, 10, 12, 15, 20–100 lb. Published only the head size 2"–8" (read as across corners; it matches CAP SDB2 corners within 0.2").
- Estimates: overall length, 5" grip and handle Ø (1.10" cast to 12 lb, 1.25" steel) from CAP SDB2. Gray enamel.
- Labels: raised silver numerals in a raised frame. Photos (13): 3/5/12/15/40/45/50/80/100 lb, vertical racks end-on.

## Amazon Basics neoprene — `amazon-basics-neoprene-dumbbell`
- https://www.amazon.com/dp/B01LR5S6HK and per-weight variants (B01LR5R18K … B01LR5SIRI).
- Weights and published L × W (in), colour: 1 4.88×1.78 pink · 2 5.78×2.32 pink · 3 6.3×2.7 purple · 4 6.7×2.8 blue ·
  5 7.05×3.21 green · 6 7.35×3.35 orange · 7 (7.7×3.47 interpolated) light grey · 8 8.18×3.59 yellow · 10 8.6×4.02 navy ·
  12 8.97×4.36 black · 15 9.7×4.64 dark grey · 20 10×5.1 dark green. Listed handle Ø 1–1.25".
- Estimates: head length 0.6–0.64 × width, coated handle Ø and flare, edge rounding. Weight "NLB" with underline moulded on each end face.
- Photos (16): every weight pair, both racks, lifestyle.

## Rogue urethane (IP0661) — `rogue-urethane-dumbbell`
- https://www.roguefitness.com/rogue-urethane-dumbbells; Garage Gym Reviews. Weights 5–150 lb (5).
- Published: head Ø 127 (5–15), 153 (20–30), 173 (35–45), 193 (50–125), 204 mm (130–150); straight 6" chrome handle, medium
  knurl, 31 mm to 45 lb / 34 mm from 50 lb; white print.
- Head lengths: REP's identical OEM heads photo-measured to 50 lb; 55–150 lb from a mass model fitted to those photos
  (±10 %). Gap between heads ≈ 143 mm measured (the 6" includes the collars).
- Face: flat with a concentric step at 80 % Ø and rounded rim; white ROGUE over a boxed weight. Chrome collar ring and flange washer.
- Photos (8, every image on the page): product shots, set on rack, knurl macro, face macro, lifestyle.

## REP Fitness urethane (DBS-5000) — `rep-urethane-dumbbell`
- https://repfitness.com/products/urethane-coated-round-dumbbell-pairs (+ .json). Weights 5–150 lb (55+ in sets).
- Published: total handle 6.0", knurl 4.8", 32 mm (5–50) / 34 mm (55+). Head Ø photo-measured 126/152/172/191 mm, matching
  Rogue's bands; lengths as above. Bright zinc flange washer ≈ 59 mm and sleeve; white REP over boxed weight.
- Photos (15 + 10 per-weight): upright pairs 5–50, face and handle macros, racks, lifestyle.

## Troy Barbell pro-style (HFD-C, HFDC-C, PFD, RUFD) — `troy-pro-style-dumbbell`
- https://dumbbellsdirect.com/products/troy-hfd-c-pro-style-hammer-tone-gray-dumbbell-sets-chrome-end-caps (+ .json),
  https://www.gtechfitness.com/troy-pro-style-dumbbells-pfd/, https://www.ironcompany.com/troy-barbell-pro-style-dumbbells.
- Weights 5–52.5 (2.5), 55–150 (5). Published: 27 mm straight (HFD) / 32 mm contoured (HFDC) handle, 150 mm handle length,
  deep-set knurl, chrome end caps with TROY and weight tags. Finish param: gray hammertone, black textured, rubber.
- Estimates: plate diameter by weight from photos (115 mm at 5 lb, growing to the 8" plate by 27.5 lb); plate thickness
  and count from a cast-iron mass model (≤ 27 mm plates: 10 lb one plate, 45–50 lb two, 85 lb four, as photographed).
- Photos (14): 10/25/45/50/65/85 lb product shots, contoured-handle 25 lb, 5–100 set, 6 lifestyle shots.

## Ivanko fixed (R/EP-1.25, RUB/EPR, RMC/EPC) — `ivanko-fixed-dumbbell`
- https://ivankobarbell.com/products/fixed-dumbbells-cast-iron-plates-w-ductile-cast-iron-end-plates-gray-r-ep-1-25 (+ .json), https://ivankobarbell.com/pages/fixed-dumbbells.
- Weights 5–57.5 (2.5), 60–150 (5). Published: 30 mm drop-forged handle, cast iron plates, ductile iron end plates,
  5 and 7.5 lb with washers instead of end plates. Finish param: gray, rubber-encased, chrome.
- Estimates: plate Ø (150 mm at 5 lb to 230 mm from 20 lb, photos), mass-model plate stack, end plate ≈ 0.62 × Ø with a gold IVANKO oval and weight tag.
- Photos (14): 17.5/20/22.5 lb gray, chrome 20/22.5, rubber 10/22.5 and sets, RM3 bronze set, rack photos.

## York Barbell vintage roundhead — `york-vintage-roundhead-dumbbell`
- Collector reference: Vintage Weights PGH, "York Roundhead Dumbbells – How to Identify, Buy, Restore" (https://www.youtube.com/watch?v=Vxsd6u8f40c, page https://www.vintageweightspgh.com/equipment/york-roundhead-dumbbells). eBay/Worthpoint block automated access; frames from the video were used as photos.
- Made 1960s–1990s (USA stamp = 1990s); run 1–10, 12, 15–100 lb (no 11/13/14). Smooth (not knurled) steel handle; crowned
  cylindrical heads; raised YORK in a rectangle on one head's rim, the weight on the other. Some were gray hammertone (finish param).
- No dimensions are published: head Ø from a cast-iron mass model (7.15 g/cc) at the photographed 0.5 width/Ø, 124 mm grip,
  1⅛" handle (thinner on the smalls). Estimates throughout.
- Photos (10 frames): full 1–95 lb layout, 15 lb close-ups, gray smalls, racks.

## York Barbell vintage buns & globes — `york-vintage-bun-globe-dumbbell`
- Collector reference: Vintage Weights PGH, "Vintage York Bun & Globe Dumbbells Explained" (https://www.youtube.com/watch?v=HdxSIU3Bxt4), transcript and frames.
- 1930s–60s set: solid-cast buns 1–10 and 12 lb; buns on a 1" bare steel bar 15–45 lb; globes 50–100 lb (5 lb steps).
  Handle ≈ 5" (4.5" on the 55/65), straight, not knurled. Painted black originally, now patina. YORK on one head, number on the other.
- Estimates: bun (superellipse) and globe (sphere) diameters from the mass model; bun profile from photos.
- Photos (12 frames): globe rows 50–100 with YORK panels, 70 lb on a scale, 8/10 lb buns, 35 lb buns, lineups.

## York Legacy solid round — `york-legacy-round-dumbbell`
- https://yorkbarbell.com/product/legacy-solid-round-dumbbell/, fitnesssupply.com, piquefitness.com, baresteelequipment.com (+ .json).
- 5–150 lb (5), re-creation of the foundry roundhead; fully knurled 33 mm thick-grip handle; black paint; framed YORK® and weight panels on the rims.
- Estimates: head Ø from the mass model at W/Ø 0.5 (York's 5–45 lb photos), 127 mm grip. No size chart published.
- Photos (13): York's 5–45 lb studio set plus 10 and 25 lb detail shots.

## Rogue Thompson Fatbell — `rogue-thompson-fatbell`
- https://www.roguefitness.com/rogue-thompson-fatbells; tfusa.net; Garage Gym Reviews.
- Published bell Ø: 9 161 · 13 172 · 18 185 · 26 194 · 35 204 · 44 214 · 53 221 · 62 230 · 70 236 · 80 244 · 88 244 ·
  97 256 · 106 262 · 124 273 · 150 286 mm. Handle 32 mm (9–18), 37 mm (26–88), 40 mm (97+). Flat machined base; 9–18 lb open at the bottom too.
- Estimates: top cut at 0.785 R (opening ≈ 0.9 × the rim), base flat at −0.89 R, cavity sized so the iron mass matches the
  weight. Stripe colours read from Rogue's lineup photo (44/124 lb read as purple, 80 lb grey).
- Photos (9): Rogue studio shots, lineup 9–150 lb, lifestyle, top view with interior handle.

## Loadable handles
All carry iron plates on each sleeve (`load` = plates per side, 0–100 lb in 2.5/5 lb steps, filtered to what fits the
sleeve with any collar). 25 and 10 lb plates reuse `buildPlateStack` (shared Olympic plate specs); 5 lb (203 × 22 mm) and
2.5 lb (162 × 16 mm) change plates are estimates in the same profile.

- **Rogue DB-15 / DB-10** — `rogue-db15-loadable-dumbbell`. https://www.roguefitness.com/rogue-loadable-dumbbells, DB-15 stainless page.
  Published: 20.5" / 14.25" long, 6.75" / 3.625" loadable sleeves, 28.5 mm Ohio knurl, 5.5" knurl, bronze bushings, snap
  rings, black zinc or stainless shaft, bright zinc sleeves (matte black sleeves on the stainless SSIL version), OSO collars optional.
  Estimated: 70 × 13 mm collar flange, OSO collar 92 × 42 mm. Photos (11).
- **The Strength Co. MB-12** — `strength-co-loadable-dumbbell`. https://www.thestrength.co/products/loadable-dumbbell-made-in-usa (+ .json).
  Published: 18.75" long, 5.75" sleeves, 6" between sleeves, 28.5 mm medium knurl, bright zinc, dual bushings; white end-cap label. Photos (13).
- **CAP OB-20** — `cap-olympic-dumbbell-handle`. https://capbarbell.com/products/cap-barbell-deluxe-folding-foam-exercise-mat (OB-20 JSON), Amazon B0D17PDBL1, Iron Company.
  Published: 20", 6.5" sleeves, 2" plates, rotating sleeves, screw collars, black oxide or chrome, chrome with rubber grip. Estimated flange 72 × 10 mm, collar 76 × 25 mm with T-screw. Photos (14).
- **Titan loadable 20"** — `titan-loadable-olympic-dumbbell-handle`. https://titan.fitness/products/loadable-20-in-olympic-dumbbell-handles-pair (+ .json).
  Published: 20", 6.5" sleeves, 5.75" knurled grip, 28 mm shaft, 50 mm sleeves, chrome, bronze bushings, 12 lb, navy end cap. Estimated: two-step collar (70 / 58 mm). Photos (8).

## Visual review
Rounds were rendered with `scripts/shoot-part.ts` on port 5403 and compared with the photo sets above; see the PR for the
before/after notes and `docs/evidence/issue-110/` for committed screenshots.
