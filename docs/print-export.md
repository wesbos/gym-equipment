# Printable miniature 3MF export

The **Export → 3MF** menu offers **1:10** by default and **1:20** miniature scale.
Open the downloaded 3MF as a **project** in Bambu Studio or OrcaSlicer. It contains
two named 256 × 256 × 256 mm plates: **Parts** and **Hardware**. Select your real
printer and filament profiles before slicing; the archive supplies a placeholder
256 mm bed printer, a **0.4 mm nozzle default process** (`0.20mm Standard @BBL X1C`)
and Generic PLA color slots, not G-code or a validated machine profile. These
equipment reconstructions are miniature models.

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
structured report. Holes and official vendor wordmarks are retained.

## Print detail

Laser-cut numbers and stencils are Boolean cuts fused into their solids, so the
exporter cannot filter them as volumes. Instead it injects a build-time flag into
every part build: `params.printMinFeature`, the minimum printable cut width in
source millimetres, `2 × 0.4 mm nozzle × scale` (8 mm at 1:10, 16 mm at 1:20,
i.e. 0.8 mm printed). Absent or `0` is full detail, so the on-screen model and GLB
are unchanged. Builders honor it as follows:

- Upright hole-station numbers (~5 mm digits, 0.5 mm at 1:10) are always omitted.
- The BOS STRENGTH stencil and user logo cuts get a morphological opening at that
  width: cut features narrower than it vanish, wider ones keep their outline with
  corners rounded to half of it. Stencil bridges widen to the same minimum. At 1:10
  the nameplate lettering survives; the lite crossmember's lettering, and all
  lettering at 1:20, is sub-nozzle and removed.

The report's `printDetail` and the model Description state the suppression.

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
it to Z=0, then packs bounding rectangles largest-first with optional 90° rotations. Definitions with
`printOrientation: 'standing'` (uprights) skip the height heuristic and keep their
builder Z-up frame, base flange down, so the hole column prints as vertical
tunnels without supports; a 2032 mm upright is 203.2 mm tall at 1:10. Packing
only rotates about Z, so standing parts stay standing.
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

`print_settings_id` names the system process `0.20mm Standard @BBL X1C` (0.4 mm
nozzle) and the file omits `different_settings_to_system`/`inherits_group`. In both
readers' `PresetCollection::load_external_preset`, a found system preset with an
otherwise empty different-settings list has every other key reset to the system
values, so it is selected unmodified rather than as an edited or "(project)"
preset; `update_compatible(Never)` keeps that selection against the placeholder
printer. If the BBL profile is not installed (e.g. Orca without the BBL vendor
enabled) the readers fall back to a project process built from defaults, as before.
Choosing a real 0.4 mm printer then keeps or substitutes its own 0.4 process.

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
objects and 10 Hardware objects, retaining all 83 volumes and 263,156 triangles (print detail simplified).
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
machine settings are deliberately not suitable for immediate G-code slicing.
Physical printing and G-code generation are not claimed.
