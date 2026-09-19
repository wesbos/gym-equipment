# REP Fitness benches and bench attachments (#113)

Sources checked 2026-09-19. REP's Shopify store serves product JSON at `repfitness.com/products/<handle>.json` (image
lists) and the tech-spec tables in the product page HTML. Official manuals and spares sheets are in the public blob
container `https://repcustomerfiles.blob.core.windows.net/publicfiles/` (the container listing is public): `FB-5000.pdf`,
`FB-5002.pdf`, `AB-5300-BlackWing-Assembly.pdf`, `AB-5300-BlackWing.PDF` (spares), `AB-4100.pdf` (spares, rev F),
`AB-5202-Assembly.pdf`, `AB-5202.PDF`, `AB-5200.pdf`, `AB-3100.pdf`, `AB-3002.pdf`, `AB-3000 2.0 Spare Sheet (Rev L).pdf`,
`AB-3000.pdf`, `AB-5000.pdf`, `AB-5000-01.pdf`, `Leg Extensions and Leg Curl Bench Attachment Assembly Instructions (rev C).pdf`,
`Leg curl ext Spares.pdf`, `Decline Leg Roller Assembly Instructions.pdf`, and the sell sheets `REP-Adjustable-Benches-Sell-Sheet.pdf`,
`SellSheet/Adjustable-Benches.pdf`, `SellSheet/Flat-Benches.pdf`. Dimension line drawings come from the product pages
(`cdn.shopify.com/.../t/16/assets/acf.<model>...Dimensions-Line-Drawing.png`, `acf.FB-5000_Dims.png`, `acf.AB-3100_Dims.png`,
`acf.AB-3000-2.0-Dims.png`, `files/Dims_BA-5010-Base.png`, `products/AB-5000-DIMS.jpg`) and
`cdn.arenacommerce.com/repfitnessco/Decline Leg Roller_DIM Drawing .png`. Discontinued pages (AB-4100, AB-5000, AB-3000 1.0)
were read from the Wayback Machine; Gym Radar popularity from `gymradar.com/equipment/type/bench?q=rep`.

Photos looked at (downloaded, contact-sheeted, read): FB-5000 11 (studio thumbnails in 4 colours, side, ¾, foot/wheel,
handle, standard-vs-wide), BlackWing 12 (studio, lifestyle flat/incline, T-foot close-up, rear foot, leg-roller 1.0 mounted),
AB-4100 12 (REP studio set), AB-5200 2.0 11 (studio, knurled handle, rear ladder, adjustable post, front ladder, stand),
AB-3100 8, AB-3000 2.0 10 (studio, leg rollers, ladder numbers, badge), AB-3000 1.0 12 (owner review set, gymcrafter.com),
AB-5200 1.0 9 (Garage Gym Reviews / YouTube owner photos), AB-5000 12 (REP studio + DIMS photo), leg roller 1.0 5 and
2.0 9, leg extension & curl 14, plus every dimension drawing listed above.

## Coordinates

Z up, mm, origin on the floor at the footprint centre. X across, +Y toward the back-pad head end (the storage-stand /
rear-foot end), so the seat and front handle sit at −Y. Pads hinge about a pivot under the pad gap; the back pad rotates
by `backrestAngle` (positive raises the head) and the seat by `−seatAngle` (positive lifts the seat front). Floor boxes are
exact at defaults (flat pads, rollers in their use hole) and every other setting stays inside them; attachment boxes are
off-centre (`offset`) so the bench keeps its place when an attachment is added.

## Products and published dimensions

| Product (id) | Gym Radar | L × W × H (in) | Pads (in) | Angles | Colours |
|---|---|---|---|---|---|
| FB-5000 Competition Flat Bench (`rep-fb-5000`) | 114 | 50.5 × 21 × 16.9 | 48 × 12 × 4; wide 13.75 | – | Metallic Black, Red, Blue, Matte Black, Clear Coat, Army Green, White |
| BlackWing AB-5300 (`rep-blackwing`) | 112 | 59.5 × 25.8 × 17.2 | back 38.2 × 12.2 (wide 14); seat 15.6 × 12.2→8.5 | back −8, 0, 10, 20, 30, 37.5, 45, 52.5, 60, 67.5, 75, 85; seat −10, 0, 8, 15, 30, 45 | same 7 |
| AB-4100 (1.0) (`rep-ab-4100`) | 67 | 51.3 × 20.3 × 17 | back 36 × 12; seat 13 × 11.8→7.8; gap 1.57 | back 0, 15, 30, 45, 60, 75, 85; seat 0, 10, 20 | Matte/Metallic Black, Red, Blue, Army Green, White, Purple |
| AB-5200 2.0 AB-5202 (`rep-ab-5200-2`) | 61 | 57.6 × 25.8 × 17.5 | back 41.7 × 12 (14); seat 11.4 × 12→8.9 (14→11); gap 1.4; front foot 7.5 | back 0, 20, 30, 37.5, 45, 52.5, 60, 67.5, 75, 85 (+ −8, −6, −4 with adjustable post); seat 0, 8, 20, 30 | 7 frame colours, 7 rail colours |
| AB-3100 (`rep-ab-3100`) | 52 | 50.5 × 23 × 16.75 | back 34.75 × 11.75→9; seat 13 × 10.5→8; gap 1.7 | back 0, 30, 45, 60, 75, 90; seat 0, 10, 20 | Metallic Black, Red, Blue, Matte Black |
| AB-3000 2.0 FID AB-3002 (`rep-ab-3000-2`) | 50 | 56.6 × 25.8 × 17.1 | back 36 × 11.8; seat 15 × 15→10.7 (2.8–4 rounded nose); rollers 7.7 each; gap 2.1 | back −12, 0, 15, 30, 45, 60, 70, 85; seat 0, 5, 10, 15, 20; 6 roller holes | Metallic Black, Red, Blue, White, Matte Black |
| AB-3000 FID 1.0 (`rep-ab-3000`) | 37 | 54 × 26 × 17.5 | back 36 × 12 (stock); seat 15 × 15→10.7; gap 1.75 | back −20, 0, 20, 35, 50, 65, 85; seat 0, 5, 10, 15, 20; 6 roller holes | black (metallic/matte seen) |
| AB-5200 1.0 (`rep-ab-5200`) | 18 | 57.6 (2.0 value) × 20.6 (from 8.25 sq ft) × 17.75 | back 41.8 × 12 (14); seat 11.5 × 12→8.9 (14→11); gap 2.25 | back 0, 15, 30, 45, 60, 75, 85; seat 0, 15, 30 | Metallic/Matte Black, Red, Blue |
| AB-5000 Zero Gap (`rep-ab-5000`) | 16 | 57 × 20.25 (from 8 sq ft) × 17.75 | back 38.2 × 12.2 (14); seat 15.3 × 12→8 (14→7.9); 53.5 total pads at zero gap | back 0, 15, 30, 45, 60, 75, 90; seat −15, 0, 15, 30, 45 | Metallic Black, Red, Blue, Matte Black, Clear Coat |
| Adjustable Bench Leg Roller 1.0 / 2.0 (`rep-bench-leg-roller`) | 42 / 34 | 1.0: 4 in pads, adds 12.5 in; 2.0: 143.4 mm × 244.4 mm rollers, 586 mm wide, 262–387 mm roller centres, adds 405.6 mm | – | – | metallic black + nickel |
| Leg Extension & Leg Curl BA-5010 (`rep-leg-extension-curl`) | 30 | 846 × 648.7 × 918.5 mm | rollers 140 × 240 mm; horns 50 × 177 mm; handles 212 mm | extension 317.5–445 mm, curl 852.5–900 mm (roller centres); 15° bench decline | black |
| REP Bench Pad (`rep-bench-pad`) | 16 | REP pad tables | wide: AB-3000/4100 37.4 × 14→11.8 × 2.8; AB-5000 38.2 × 14 × 2.5 + 15.35 × 14→7.9; AB-5200 41.8 × 14 × 2.5 + 11.5 × 14→11; standard FB-5000 48 × 12 × 4, AB-4100 36 × 12 + 13 × 11.8→7.8, BlackWing 38.2 × 12.2 + 15.6 × 12.2→8.5 | – | black CleanGrip |

REP tolerances are 3 %. Gym Radar's "Rep Fitness Bench Pad" item is REP's Wide Bench Pad (14 in, thick foam, grippy vinyl);
the entry offers the wide pads plus three standard CleanGrip pads as `fit` options.

## Reconstruction notes and estimates

- Frame tubes: 3×3 in for the FB-5000 (published); 2×3 in 11-gauge spines elsewhere (published for the AB-5200; the AB-5000
  uses 2×3.5 in per review). Front legs, posts, cross-feet (76 × 60 mm) and wheel sizes (64–76 mm) are estimated from photos.
- Pad heights: 2.5–2.8 in from REP's pad table; FB-5000 4 in. Pad tops at flat equal the published bench heights (IPF).
- Stations along each bench (seat front, pivot, legs, feet) are placed from the drawings/photos so the published overall
  length is the frame extreme (handle, foot or storage stand) and the pads keep their published lengths and gap.
- Mechanisms: every ladder bench uses a fixed-length support link from a bracket under the back rail; the ladder slot for
  each published angle is solved where that link meets the ladder line (closed ladders keep a retaining channel, open
  ladders have teeth). Seat ladders on the front leg work the same way. Link lengths, bracket offsets and the ladder line
  are reconstructed, so slot spacing is plausible rather than manufacturer CAD. Near flat the solved stations bunch
  together, so the decline stations (BlackWing −8°, AB-3000 −12°/−20°) sit next to the 0° slot; decline notch geometry is not
  published. The AB-5200 2.0 decline angles lower its telescoping rear post (black-chrome inner post, pop-pin) instead.
- Pop-pin/ratchet benches (BlackWing seat, AB-3000 seat, AB-5000 back and seat) use quadrant plates centred on the hinge
  with one hole per published angle; radii are estimated. AB-5000 knobs are blue anodized, quadrants stainless.
- ZeroGap (BlackWing, AB-5000): `zeroGap` slides the seat 38 mm toward the back pad (estimated travel; AB-5000's published
  53.5 in pad run is the closed position).
- AB-3000 leg rollers: arm hinge low on the front post; hole 1 is the forward use position and holes 2–6 swing the rollers
  back 11° each (hole angles estimated). 2.0 has the horizontal bar handle, 1.0 the vertical ringed grip and round feet.
- Attachments on the BlackWing and AB-5000 (`attachment` param): leg rollers slide into the back-rail head end and follow
  the back angle; the 2.0 is shown at its shortest 262 mm spacing. The leg extension/curl attachment tips the bench 15°
  about its rear foot so the front foot drops into the leg receiver; receiver height is derived from that tilt, and the
  column, cam arm, horns and band pegs are placed from the BA-5010 drawing and photos. Roller stations between the
  published extremes (5 extension, 3 curl, 5 leg-roller-2.0 spacings) are evenly spaced estimates.
- Standalone leg rollers rest on their four rollers (the 2.0 flipped so its insert and handle point up).
- Logos are plain coloured plates or cut-outs (no copied artwork): FB-5000 pad side plates and stainless post badges,
  BlackWing mountain cut-out in the T-foot, AB-3000 badge plate, AB-5000 stainless beam plate, LE/LC arm plate.
- Materials: frames use role `frame` so rack paint (or the listed REP colours) recolours them; pads, rubber, wheels and
  foam are `liner`; knurled/rubber handles `handle`; stainless trim, ladder rails (AB-5200 2.0 `rail` param), boards and
  attachment steel `source`; hardware `fastener` with an authored black-zinc finish.
