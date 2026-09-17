# Grid and topology foundation

Generic BOS source geometry remains 75 mm tubing, 25 mm holes and 50 mm pitch.
New dimension edits snap to reference clear spans 425 / 725 / 1075 mm (width
and depth). Nearest catalog item wins; an exact tie chooses the smaller item.
Height uses 2032 + n × pitch within 1000–4000 mm: hole phase and cut height
are independent. The existing 80-inch upright retains 17 mm top-center clearance
(4.5 mm of steel above a 25 mm hole). Import does not snap existing dimensions.

## Document v2 and integration

`validateAssembly(unknown)` is the migration/validation boundary. It accepts v1
and v2 and returns a detached v2 document. `uprights` is an ID-keyed registry
of millimetre floor coordinates `{x,y}` (Z remains up in the existing renderer).
`connections` stores `{id,from,to,level}`; `structure` retains variant overrides
by edge ID. IDs are stable opaque strings, not position encodings. Legacy names
remain only as defaults and for specialized source upper-rail/offset adapters.
`spanTo`, `pairTo`, `pairedSpanTo` make straight bars, safeties, and paired
attachments explicit. Optional `profileId` is rack-series identity. Unknown
optional JSON fields, including appearance, survive normalization at document,
rack, upright, edge, structure variant, and accessory levels. Storage should
continue treating the validated document as opaque; no storage-key change needed.

Graph edits retain removed nodes/edges as restorable tombstones, cascade dependent
removals, and use the existing commit/history API. Coordinates are millimetres;
new generic extension spans come from the catalog. Move increments use the
current post's lattice phase and rack pitch; an invalid diagonal beam is rejected.
Preview is a labelled top view, not a replacement for the Manifold 3D model.

## Vendor verification and outstanding #8 coverage

Primary sources checked 2026-09-17:
- https://repfitness.com/products/pr-5000-power-rack-pre-selected — 50.8-inch
  outside width; 80/93-inch heights; 16/30/41-inch bays and rear 16-inch bay;
  1-inch holes, 2-inch pitch. Exact conversion is 50.8 mm pitch, 25.4 mm holes,
  406.4/762/1041.4 mm bay lengths, 2032/2362.2 mm heights.
- https://repfitness.com/products/pr-4000-rack-builder — 5/8-inch holes,
  1-inch bench-zone spacing, 2-inch elsewhere; adds a 24-inch bay.
- https://uk.repfitness.com/products/smith-machine-front-extension-bracket —
  documents REP's nominal 3-inch tubing as 75 mm. Profile clear-width mapping
  subtracts two 75 mm tubes from published outside width (1290.32 - 150).
- https://repfitness.com/products/apollo-rack-builder — **2-inch** spacing,
  52.4-inch width, 48-inch length and a 16-inch crossmember, flat foot base.
  The issue's 1-inch spacing / two-post interpretation is not used.
- https://repfitness.com/products/pr-1100-power-rack — 2×2-inch 14-gauge tubing,
  3-inch spacing, 1-inch holes, 44×24×79-inch working area. This is a different
  geometry/adaptor class from the BOS source.
- PR-1000 and PR-1050 product URLs currently redirect to collections.

PR-5000 and PR-4000 reconstructed profiles and presets are enabled. All published
4-post depths, shallow 16-inch half-rack layouts (4 posts), and 6-post layouts
with a 16-inch rear bay are provided at 80/93-inch heights. The main pitch is
50.8 mm in validation, mounts, rendered holes, crossmember flanges and straight
pull-up bolt stations. PR-5000 uses 25.4 mm bores; PR-4000 uses 15.875 mm bores.
These overrides are named manufacturer profiles; generic remains 25/50 mm.

REP confirms PR-4000's 25.4 mm bench spacing, but exact bench-zone limits were
not found in the primary docs. The model explicitly estimates bounds at stations
8–22 (471.4–1182.6 mm with the estimated 65 mm first-hole datum). Only front/back
faces have additional half stations; side faces retain 50.8 mm spacing. Fractional
station indices (e.g. 8.5) describe these extra holes, preserving integer station
identities and v1 migration. UI hole-number controls permit half steps on this
profile. Validation rejects half stations outside the zone/on side faces.

Flange outlines, first-hole datum, bases and hardware proportions are estimated
from the detailed BOS reconstruction. Straight frame flange holes are 101.6 mm
apart; straight pull-up plate holes are 203.2 mm apart. Reconstructed frame bolt
shafts have 0.8 mm diametral clearance; hardware dimensions are estimates, not
manufacturer specifications. Multi-bolt source attachments with incompatible
patterns remain unavailable rather than falsely align 50 mm to 50.8 mm. BOS
floor feet are not offered on REP profiles. Six-post bay resizing preserves the
rear storage span instead of scaling it with the main bay.

The UI names these as reconstructions and shows estimates before applying and
in active rack settings. Physical REP fit is unverified. PR-1100/1000/1050 and
Apollo/Omni-specific geometry remain outside this implementation; #8 still has
that residual coverage gap. Generic two-post half rack is not labelled Apollo.

Integration conflicts are concentrated in assembly/types and small BuilderPage
imports/settings/inspector edits. New TopologyEditor and RackPresets components
avoid restructuring shared UI. Numeric-control integration should call
snapDimensions/resizeAssembly and retain the visible target feedback. Materials
can attach optional appearance JSON without a schema bump. Thumbnail code needs
no changes. No deployment or named save UI is included.

Special adapters retain their measured restrictions: multi-grip/sphere bars need
original rectangular upper rails; offset/nameplate adapters need horizontal
left-to-right edges. Straight bars and all three safety types use arbitrary
explicit axis-aligned endpoints. No diagonal flange compatibility is assumed.
Top-view controls also expose stable-ID connection moves and cascade previews.
Keyboard arrows use `stepDimension` to move between valid catalog values; the
editor stream can reuse that adapter in its numeric controls. Move ties choose
the smaller coordinate, matching dimension-catalog ties.
