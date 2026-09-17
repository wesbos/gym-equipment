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

Reconstruction limitations live in this document; product controls show dimensions
and profile names. Physical REP fit is unverified. PR-1100/1000/1050 and
Apollo/Omni-specific geometry remain outside this implementation; #8 still has
that residual coverage gap. Generic two-post half rack is not labelled Apollo.

Integration with main through PR22 retains explicit named saves and working drafts,
per-physical-piece appearance, semantic worker material roles, and thumbnails.
Storage passes both legacy single-slot and named documents through validateAssembly;
the migration does not snap or relocate existing parts. Appearance is validated
additive v2 data. Structural/accessory edits resolve the selected physical ID to
its owner; paint keeps the physical ID. NumericControl normalizes live dimensions
through snapDimensions and uses stepDimension for catalog keyboard steps, while
keeping gesture-coalesced undo. No deployment changes are included.

Special adapters retain their measured restrictions: multi-grip/sphere bars need
original rectangular upper rails; offset/nameplate adapters need horizontal
left-to-right edges. Straight bars and all three safety types use arbitrary
explicit axis-aligned endpoints. No diagonal flange compatibility is assumed.
Top-view controls also expose stable-ID connection moves and cascade previews.
Keyboard arrows use `stepDimension` to move between valid catalog values; the
editor stream can reuse that adapter in its numeric controls. Move ties choose
the smaller coordinate, matching dimension-catalog ties.

Mounting shaft validation uses the generated retaining pins/studs, independently
of plate holeDiameter. PR4000 rejects the fixed 16 mm safety saddle pins and
oversized source attachment shafts; pin-and-pipe accepts an explicitly supplied
smaller pinDiameter (e.g. 15.5 mm), with its generated rod using that diameter.
The three source J-hook shafts are 15.766–15.7674 mm and pass the 15.875 mm bore
check. Other source shaft envelopes are conservatively rounded up to 0.1 mm in
mount-shafts.ts. Passing this geometric check does not certify physical fit.
Generic 25 mm bores and default source geometry remain unchanged.

## Standard size controls

Rack standards come from the active profile catalogs and are filtered through
`snapDimensions`. Generic BOS retains 425/725/1075 mm spans and its 2032 + n×50 mm
height lattice: of the common imperial cuts, only 80 inches is grid-valid here.
72/93/108-inch buttons are not advertised as generic compatible. Standalone upright
geometry can use exact 1828.8/2362.2/2743.2 mm cuts without implying assembly fit.
Imperial labels on metric source spans are display approximations; values stay exact.
Parts declare serializable `standardOptions` by parameter name. NumericControl
automatically renders standards plus Custom with no range slider, preserving
normalization, live worker coalescing and gesture history callbacks. Freeform
parameters retain scrubbing. Custom assembly dimensions still use grid validation.

Standalone upright radius, wall, hole diameter and end offsets are assumptions.
Source comparison views reconstruct component profiles and dimensions; they do
not certify physical fit. Source/vendor links and part branding remain intact.

## Cable / Smith family adapters

The optional v2 `systems` registry is validated by `systems.ts` and resolved after
ordinary accessories. System IDs share the document ID namespace. Supported
families: `cable-kraken`, `cable-ares2`, `cable-athena`, `cable-ares1`, `smith-rep`.
These whole-rack assemblies use graph coordinates/edges and named profile IDs;
there is no assumption that a post ID encodes its location. Their param schemas
are closed and numeric; defaults live in `system-types.ts`. Persistence preserves
optional appearance and detached unknown metadata. Explicit Save behavior stays
in the store. Unsupported edits fail before geometry generation.

Kraken adds `bos-hydra` and `bos-manticore` grid profiles with `tube: 76.2`.
Other profiles retain the 75 mm default; generic remains 25/50 mm bore/pitch.
Fixed source sleeves are rejected on the wider profiles. Manufacturer mount
shafts are estimated at bore minus 0.8 mm. Smith side-crossmember mounts share
`smithLayout` between CAD, collision boxes and resolved bolt metadata. Mounts
with `connectorId` refer to that beam's bore row instead of an upright station;
collision slot comparison therefore uses connector ID when supplied.

Catalog workers register all families, with unchanged bounded thumbnail and
scene request queues. Resolved system IDs remain appearance keys/owner IDs;
mesh material roles preserve bare rods/bars/sleeves independently of fastener
finish. Current static collision boxes cover occupied stack/trolley/bar bodies.
Exports should consume resolved instances and the worker catalog, not a fixed
list of original part IDs. See `rack-generator/research/cable-systems.md` for
manuals, dimension confidence and deliberately unsupported configurations.

Smith `outside: 1` selects the vertical PR-5000 front adapter with its full FFE
2.0 pair. Its eight rack mounts are front-facing upright stations with Y pin
axes. Internal extension-to-Smith bolts belong to the system geometry, not rack
connections. Front tubes contribute collision bodies. Other front variants are
explicitly rejected; inside configurations and existing profiles are unchanged.
The shared `catalog.ts` now registers these builders for scene, thumbnail and
3MF workers. Its `systemAttribution` resolver supplies manufacturer/reconstruction
credits. Additional vendor resolvers should compose with this resolver rather
than replace it. No material finish or source nameplate is changed by attribution.
