# Rack appearance

`RackDoc.appearance` is an optional, additive field. Documents without it remain valid at the existing document version. `validateAssembly` validates and detaches it alongside the rack data; storage, JSON import/export and undo/redo use that same document.

```json
{
  "frameColor": "#283e32",
  "hardwareFinish": "chrome",
  "overrides": {
    "front-left": "#af2121",
    "jhooks-front:left": "#ffd000",
    "jhooks-front:right": "#ffffff"
  }
}
```

Overrides use `ResolvedInstance.id`, not `ownerId`: matching sides and composite members can differ even when their geometry comes from the same cache entry. Unpairing transfers side overrides to the new instance IDs. Removing an override restores the global color. Global settings never clear overrides. Unknown but syntactically valid IDs are retained so temporary removal/restoration and future document migrations do not discard appearance data.

Every `SolidPart` and transferred `LibraryMesh` requires a semantic material role. CAD definitions assign these roles explicitly. The attachment manifest uses exact source names scoped to a part, with feature-index exceptions for mixed source groups. New or unclassified attachment groups default to `source`, not hardware. No rendering code infers role from names, brightness or metalness.

`resolveMaterial(source, appearance, instanceId)` returns detached color/metalness/roughness data. Frame roles use the instance override, then global color, then the default green. Fasteners use Chrome (default), Gold or Oxide. Handles, rods, sleeves, liners and source materials retain their original color and PBR values. Controls intentionally color painted surfaces, not liners or grips. Future Smith rods should use their own role, not `fastener`.

The builder creates independent materials per physical instance while sharing cached geometry. GLB exports use the same resolved scene materials. A future 3MF exporter can call `resolveMaterial` and use its color directly; there is no 3MF writer in this branch.
