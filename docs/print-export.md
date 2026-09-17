# Printable miniature 3MF export

The **Export → 3MF** menu offers **1:10** by default and **1:20** miniature scale.
Open the downloaded 3MF as a **project** in Bambu Studio or OrcaSlicer. It contains
two named 256 × 256 × 256 mm plates: **Parts** and **Hardware**. Select your real
printer, nozzle and filament profiles before slicing; the archive supplies only a
placeholder 256 mm bed, 0.4 mm nozzle and Generic PLA color slots, not G-code or a
validated process profile. These equipment reconstructions are miniature models.

## Objects, identities and materials

Only CAD solids explicitly marked `role: 'fastener'` go to Hardware. Rods, handles,
liners and other structural volumes stay on Parts. A hardware-only instance goes
entirely to Hardware. Each physical instance can therefore produce two independent
build objects. Both retain its original `id`, `ownerId` and catalog `part` in
`Metadata/print-report.json`; object names include the original ID and plate name.
Empty plates are still declared, without fabricated geometry.

Colors use `resolveMaterial(source, appearance, physicalId)`. Hardware finishes
apply to fasteners only; per-side paint uses physical IDs. Both parent-object and
child-volume filament assignments are written, because slicers use the parent's
filament for single-volume objects. Textures, reflections and roughness are reduced
to solid color. Vendor attribution remains in model Copyright metadata and the
structured report. CAD logo cuts, holes and official vendor wordmarks are retained.

The exporter rebuilds CAD with Manifold, never scene meshes. `buildPrintInstance`
forwards resolved logo contours to the builder. Resolved `kind: 'floor-item'`
instances are excluded before CAD building, packing and vendor-credit collection;
the report lists excluded IDs. Grid, lighting, reference assets and selection
geometry never enter the exporter.

Within a physical instance, later CAD components own overlapping space. Earlier
solids are cut against their union **before** splitting by role, preserving the
existing cavities and material boundaries. Fully covered components are reported.
Every source, Boolean result and exact Float32 mesh is checked with Manifold;
exported indices, finite coordinates, triangle area and closed directed edges are
validated. Disconnected shells within a named CAD solid stay together. No meshes
are silently clipped, repaired by a slicer, or dropped to fit a plate.

## Scale, packing and overflow

`PrintScale = 10 | 20` is the denominator; `PrintOptions.scale` defaults to `10`.
The report records `scale`, `scaleFactor`, each object's dimensions, placement,
scaled source position, roles and plate. The menu appends `-1-10` or `-1-20` to the
filename. No individual part is resized to fit.

Laid-out mode rotates each role group to its smallest bounding-box height, lowers
it to Z=0, then packs bounding rectangles largest-first with optional 90° rotations.
At 1:10 the arrangement reserves 2 mm between rectangles and at bed edges. At
1:20 both geometry **and this arrangement** are halved (1 mm clearance). If the
configuration cannot pack at 1:10, 1:20 retries against the larger source-space
bed. Packing is deterministic, conservative and not an optimal nesting solver.
Brims and supports are not generated; configure and check their clearance in your
slicer. The second plate's 307.2 mm X offset is slicer workspace spacing, not a
model dimension, and does not scale.

Assembled mode scales the document's XYZ Euler rotations/positions in source
Z-up coordinates, then translates each plate's whole assembly onto its bed.
Relative geometry and positions remain intact; this mode can contain contacts and
floating components and is not the flat printing arrangement.

Every transformed object's bounding box and final placement must lie within the
256 mm volume, including diagonal extents after rotation. The assembled plate's
aggregate bounds are also checked. An oversized object or packed plate fails the
**whole export**, naming the dimensions or packing failure and suggesting 1:20
when 1:10 fails. At 1:20 it suggests a smaller configuration/laid-out arrangement.
It does not add extra plates or silently alter geometry.

The dedicated one-shot worker preserves progress, error and cancellation behavior.
Termination cancels the job; all owned CAD solids are deleted in `finally`. No
source document, undo history, geometry cache or saved design is modified. Exports
stop above two million triangles.

## Slicer format and verification

The package uses standard OPC relationships, millimetres, base materials,
child-before-parent resources and independent build items. Bambu/Orca plate
membership uses `Metadata/model_settings.config` plate entries with `plater_id`,
`plater_name` and `model_instance` object/instance/identify IDs. Application uses
`BambuStudio-01.09.00.00` solely as a compatibility marker; Designer identifies
BOS STRENGTH. This selects readers that preserve the filament palette.

Official implementation references inspected September 17, 2026:

- [Bambu 3MF reader/writer](https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/Format/bbs_3mf.cpp)
- [Bambu plate coordinates](https://github.com/bambulab/BambuStudio/blob/master/src/slic3r/GUI/PartPlate.cpp)
- [Orca 3MF reader/writer](https://github.com/SoftFever/OrcaSlicer/blob/main/src/libslic3r/Format/bbs_3mf.cpp)
- [Manifold Mesh API](https://manifoldcad.org/docs/jsapi/classes/manifold.Mesh.html)

Reproduce fixtures and automated checks:

```sh
npm ci
npm test
npm run build
npx tsx scripts/generate-print-fixtures.ts
/path/to/BambuStudio --info --arrange 0 --orient 0 \
  --export-3mf bambu-roundtrip.3mf --outputdir /absolute/output \
  /absolute/output/rack-laid-out-1-10.3mf
python3 scripts/verify-print-export.py source.3mf bambu-roundtrip.3mf orca-roundtrip.3mf
```

The default six-color fixture has 14 physical identities, split into 14 Parts
objects and 10 Hardware objects, retaining all 83 volumes and 311,988 triangles.
Tests cover every catalog builder's decimal XML mesh round-trip through Manifold,
roles, identity, colors, vendor marks/credits, scale ratios, positions, packing,
bounding-box overflow and failure behavior.

Real installed **Bambu Studio 02.08.01.55** CLI and **OrcaSlicer 2.2.0** GUI
imports/re-exports were used at both scales. The independent Python auditor checks
ZIP CRC, relationships, mesh indices/areas/directed edge closure, zero repair
counters, exact named-plate membership, in-bed positions, dimensions, volume names
and colors against each source. Orca's GUI visibly shows Parts and Hardware at
both scales. Its CLI crashes on named plates in `generate_plate_name_texture`
(OpenGL without a context); GUI Open Project → Save Project As verifies the actual
named archive without removing plate names to bypass that crash. Placeholder
process settings are deliberately not suitable for immediate G-code slicing.
Physical printing and G-code generation are not claimed.
