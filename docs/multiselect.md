# Physical multiselect (#31)

`BuilderSnapshot.selection` is a transient readonly physical-ID array. `selected`
is the last physical ID for existing single-inspector integrations. Neither is in
RackDoc or saved configuration JSON. `select(id, event, orderedIds?)` is the gesture
entry point: Cmd/Ctrl toggles, plain clicks replace, Shift ranges use a stable list
anchor. Placement and swap modes win over gestures. Programmatic `select(id)` keeps
the previous explicit cancel-and-select behavior for topology/swap callers.
`selectMany(ids, additive)` supports marquee and future suggestions (#32).
`escape()` clears selection, placement, swap and the Select tool.

The parts drawer lists physical instances (paired sides separately). The catalog
still adds part types. Select enables rubber-band dragging in the viewport;
projected physical bounding-box centers inside the rectangle are selected,
including occluded pieces. Cmd/Ctrl adds to an existing selection. Escape cancels
an active rectangle. Turning Select off restores ordinary orbit. Every selected
piece has its own disposable outline.

Paint edits physical IDs through the existing appearance overrides and shared
`resolveMaterial` used by the scene and GLB export. Owners are deduplicated only
for parameter changes/removal. Removing one side removes its owning pair; the
bulk inspector explains this. `selectionOwners`, `sharedFields`, and
`editableFields` in `src/state/selection.ts` are reusable integration boundaries.
The single and bulk inspectors share parameter metadata, including vendor field
intersections and intersected numeric bounds. Unsupported mounting, variant,
structural duplication and partial-pair duplication controls are hidden.
Complete accessory owners can be duplicated, preserving both side colors and
explicit topology endpoints, at their original mounts; select a copy to move it.
Each bulk operation validates and commits once, making it one undo entry.

Current instance metadata does not expose standalone fastener instances or an
editable enabled flag. These bulk controls are therefore not offered. Rack-wide
hardware finish remains in rack/single settings and affects fasteners only.
Additional appearance controls from #25 should call the same physical selection
transaction pattern; do not replace IDs with owner IDs for paint. The reset/swap
controls from #18/#23 are preserved and single-owner operations stay outside the
bulk inspector. Named configurations still require explicit Save; draft recovery
remains opt-in.

Validation: 4 new store tests exercise selection gestures and placement priority,
one-step paint undo/redo, explicit saved config and material export resolution,
independent pair colors, owner deduplication, copied pair colors, group deletion,
shared fields, and atomic parameter edits. Browser session
`gym-wave2-multiselect`, port 5311, exercised real viewport raycasting with four
Cmd-clicks, list range/toggle/plain selection, Escape, placement precedence,
marquee dragging (14 pieces), orbit, mixed pair paint, duplicate/delete/undo,
explicit Save/reload, and downloaded GLB JSON material inspection (red paint).
