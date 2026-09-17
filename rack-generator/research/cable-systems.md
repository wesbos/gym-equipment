# Cable system research

Research gathered September 17, 2026. These products need separate system-level assemblies, rack compatibility profiles, and cable routing. They are not yet implemented by the existing-parts expansion.

## REP Ares 1.0

Official knowledge base: https://knowledge-base.repfitness.com/en_us/ares-10-rJXy5s__Ml

- 5000 six-post assembly instructions: https://repcustomerfiles.blob.core.windows.net/publicfiles/PRA-FT-DUAL-6-AssemblyInstructions%20(1)-compressed.pdf
- Original exploded parts list: https://repcustomerfiles.blob.core.windows.net/publicfiles/PRA-FT-5000-DUAL-6.PDF
- 5000 four-post assembly instructions: https://repcustomerfiles.blob.core.windows.net/publicfiles/Ares%201.0%20PR-5000%204-post%20Assembly%20Instructions.pdf
- Official original product: https://at.repfitness.com/products/ares-cable-attachment-4-post-series

Separate cable kits are specified for rack height and depth. Manuals show two upper and two lower cables, floating pulley blocks, stack pulleys, lat pulldown routing, and low-row routing. Six-post configurations use a 16-inch rear bay. Original four-post configurations use a 16-inch depth. Nominal rack heights are 80 and 93 inches. Manual exploded diagrams and parts lists are useful for reconstructing topology and component inventory.

## REP Ares 2.0

- Official product: https://ca.repfitness.com/products/ares-2-0-builder
- Engineering comparison: https://repfitness.com/blogs/guides/what-makes-the-ares-2-0-the-best-integrated-functional-trainer-yet
- Assembly instructions, Rev K: https://newrepcustomerfiles.blob.core.windows.net/publicfiles/Product/Assembly%20Instructions/Ares%202.0%20Assembly%20Instructions%20(Rev%20K).pdf
- Manufacturer specification sheet: https://repcustomerfiles.blob.core.windows.net/publicfiles/SellSheet/ARES-2.0.pdf

Distinct geometry from 1.0: reoriented rearward weight stacks, outward-offset trolleys, revised cable routing, elevated/swiveling low row, reshaped footplate and bench clearances, swiveling lat pulldown, integrated incremental weights. Published total heights are 82.1/93.9 inches for nominal 80/93-inch racks. Cable travel is 71.3/94.9 inches; published pulley ratio is 2:1. Product configurations must be checked separately: pages differ in which front/rear projection is included in added-depth specifications.

REP explicitly designs Ares for compatible REP PR-4000/PR-5000 racks and does not guarantee fit on other brands. Our existing generic 75 mm, 25 mm bore rack is not sufficient evidence of compatibility.

## Bells of Steel

The likely requested brand is Bells of Steel. Kraken is the integrated rack cable attachment family; Cable Towers are another distinct family.

- Kraken official support: https://support.bellsofsteel.com/en-US/articles/kraken-321315
- Four-post dimension diagram: https://bellsofsteel.com/cdn/shop/files/KRAKEN-4P-PRNT-specs_75349811-5fbe-4523-a0fd-14e762726d8a.jpg
- Four-post stack assembly manual: https://bellsofsteel.com/cdn/shop/files/PM_Kraken_4_Post_-_Weight_Stack_-_2025.12.15.pdf
- Six-post plate-loaded manual: https://bellsofsteel.com/cdn/shop/files/PM_Kraken_6_Post_-_Plate_Loaded_-_2025.12.15.pdf
- Cable Tower dimensions: https://bellsofsteel.com/cdn/shop/files/pult5-ma-prnt-newdesign-specs.jpg
- Cable Tower assembly manual: https://bellsofsteel.com/cdn/shop/files/PM_STK-PULT4-MA-SET_-_2025.12.19-v2.pdf

Kraken uses Hydra/Manticore true 3-inch (76.2 mm) tubing and the relevant 5/8-inch or 1-inch mounting hardware. Four-post configurations cover 84/90-inch heights and 24/30/43-inch depths; 108-inch configurations need appropriate raised crossmembers. Stack and plate-loaded variants have different lateral envelopes. Each side has two cable outputs; each output is 2:1 and combining them provides 1:1. These are different constraints from the current generic 80-inch frame.

## Proposed implementation approach

1. Introduce rack profiles with manufacturer-specific widths, tube dimensions, hole spacing, heights, bay layouts, and supported attachment versions.
2. Model a cable system as a compound assembly: lower/upper brackets, pulleys, guide rods, weight plates, shrouds, trolleys, swivel assemblies, stops, cables, and handles. Maintain real mating transforms per component.
3. Generate rigid components with Manifold. Represent cables as paths made of straight tangent segments and pulley-wrap arcs; preview them with tubular render geometry. Rebuild static meshes only when dimensions change.
4. Store trolley stations, selected stack weight and optional handle extension as system state. Move connected subassemblies through transforms; preserve cable length and pulley ratio when adding motion.
5. Reserve the system's footprint and trolley travel envelopes and validate interference with braces, storage, safeties, pull-up bars and benches.
6. Retain source and measurement confidence for each dimension. Manuals establish topology but do not fully dimension pulley centres, plate profiles, guide-rod spacing, cable lengths or shrouds. Obtain measurements or manufacturer CAD before claiming a dimension-exact reconstruction. No public manufacturer CAD/GLB was found during this pass.

## Implementation verification — wave 2, September 17, 2026

The static reconstruction now lives in `parts/cable-systems.ts`, `parts/smith.ts`
and the scoped `parts/system-geometry.ts` Manifold helpers. `systems.ts` owns
compatibility; it derives rows and bays from coordinates and graph edges, never
from IDs such as `rear-left`. This is reconstruction work, not manufacturer CAD.

Manuals inspected (local PDFs were downloaded and relevant diagram pages rendered):
- Kraken 4 Post Weight Stack, 2025-12-15: pages 1–4 hardware/parts, 8 guide
  sockets and stack, 11 return/floating pulleys, cover for twin adjacent outputs.
  The source is the official manual linked above. Hydra/Manticore use true
  76.2 mm tubing. Nominal M16 hardware in a nominal 5/8-inch bore is represented
  with estimated diametral clearance; generated shaft diameter is bore minus
  0.8 mm and is never allowed to exceed the rack bore.
- ARES2 Rev K: hardware/parts pages 2–4 and 4-/6-post assembly. Reoriented stacks,
  outer trolleys, incremental plates, low-row footplates and lat routing differ
  from historical ARES1. Current [4-post product](https://repfitness.com/products/ares-2-0-cable-attachment-4-post-series)
  documents PR-5000 16-inch; enabled with explicit anchoring. PR-4000 four-post
  remains blocked (manual has older bracket instructions but current availability
  is inconsistent). Six-post PR-4000/5000 use a 16-inch rear bay.
- ARES1 6-post instructions, 45-0105-V2, and original product documentation:
  lengthwise rear stacks, inward trolley position, lower row outlet; historical
  envelope and fabrication details remain estimated.
- Athena 4-post assembly, parts page 3: plate-loaded bearing carriage/horns and
  selectorized headplate/stem/guide-hole topology. Current
  [Athena FAQ](https://repfitness.com/products/athena-builder) restricts PR-4000
  to 6-post with updated vertically drilled 16-inch crossmembers. PR-5000
  requires the modern uniform-hole rack (the profile represents this version).
- [Smith assembly Rev B](https://newrepcustomerfiles.blob.core.windows.net/publicfiles/Product/Assembly%20Instructions/Smith%20Machine%20Assembly%20Instructions%20(RevB).pdf),
  parts pages 2–3 and crossmember L-bracket steps 2–5. Lower L-brackets have two
  through holes; mounts are on side crossmembers, not upright faces.
- [Smith configuration guide](https://newrepcustomerfiles.blob.core.windows.net/publicfiles/Product/Assembly%20Instructions/Smith%20Machine%20Configuration%20Guide%20(with%20summit).pdf)
  plus the [official Smith FAQ](https://ca.repfitness.com/products/smith-machine-rack-attachment).
  Six-post cable compatibility and PR-4000 angle exclusion are enforced. Inside
  flip-down/strap safeties are blocked; shallow bays also block internal safety
  pipes/spotter arms. Front/outside mounting is explicitly unavailable pending
  the front extension bracket and feet adapter. Both angle signs and vertical
  installation share one tilted guide/carriage reference.

Published anchors: 80/93-inch REP uprights; 84/90-inch Kraken; exact 50.8 mm
profile pitch and 15.875/25.4 mm bores; ARES 260/310 lb, Athena 170/220 lb and
Kraken 210 lb options; Smith 1880 mm total width, 35 mm shaft, 289.5 mm sleeves,
396–1721/2029 mm bar travel and 16/19 racking positions. Smith shaft, guides,
sleeves and handles are polished semantic materials, never hardware finish.
ARES2 published added height (2.1/0.9 inches) and Athena 1.8 inches are used.

Estimated: first-hole datum; all plate outlines/thicknesses; pulley sizes and
centers; stack plate dimensions/guide spacing; bearing housings; shrouds; detailed
cable lengths and routes; Smith guide/catch offsets and intermediate catch pitch.
The paths are static solids with sampled wraps/return paths, not a cable-length
or tension simulation. Weight labels describe manufacturer options, not mass
computed from the approximate steel volumes. No manufacturer logo geometry is
invented; vendor credits are in catalog descriptions/UI and user BOS branding
is left intact.

Remaining scope, do not close parent issues solely on this stage:
- Kraken 108-inch/raised-crossmember installation adapter.
- Front/outside Smith extension bracket + front feet (optional accessory in #12).
- Manufacturer-detail audit of estimated internal cable routes, mount/stack
  clearances and historical ARES1 envelopes; physical measurements/CAD have not
  been supplied. Static collision boxes cover working stack/trolley/bar bodies;
  they are not a swept-motion or manufacturing-clearance guarantee.

System documents are additive v2 data: `systems?: {id, part, params}[]`. Validated
system edits use ordinary store commits/undo and explicit named Save. `resolveAssembly`
returns them alongside other instances, so current GLB and worker-driven exports,
library views and thumbnails share the same solids. System fields never enter
legacy single-hole accessory validation. Removing dependent frame structure
removes systems conservatively; undo restores both. Changing a supported frame
span re-resolves system geometry; unsupported topology edits are rejected.
