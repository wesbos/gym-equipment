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
