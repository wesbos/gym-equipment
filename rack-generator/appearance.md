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

## Steel finishes (#25)

Optional `frameFinish: 'paint' | 'stainless' | 'clear-grind'` defaults to paint.
`finishOverrides` maps physical IDs to those same values, alongside the original
string-valued `overrides`. A legacy color override implies paint unless an explicit
finish override exists. Choosing a metal preserves the underlying paint color;
choosing a swatch/custom color explicitly selects paint. Reset removes both overrides.
Unpairing transfers both maps. Existing migrations, named saves, opt-in draft recovery
and undo/redo preserve these additive fields without a document version change.

`resolveMaterial(...).color` is the flat **dominant export color**, including metals.
The optional `finish` discriminator tells the renderer to apply brush maps and clear
coat. 3MF integrations should use `.color`; 3MF flat colors cannot reproduce brushed
texture, metal reflections or clear coat. GLB retains UVs, the shared roughness/normal maps,
metalness/roughness and KHR_materials_clearcoat. The viewer needs environment lighting
for comparable reflections. Swatches are approximate colors, not calibrated vendor
paint samples; Matte/Metallic Black names do not imply certified paint matching.

`FrameFinishResources` owns at most two lazy 256² brush textures per builder, shared
by independently disposable instance materials. Cached geometry owns static planar
UVs, so live appearance edits never re-run CAD or create extra texture copies.
Scene teardown disposes the textures after instance materials. Ghosts retain their
existing translucent material and do not cast shadows. Part-study scenes stay neutral.

## Builder floor (#26)

`createGymFloor` owns one static 1024² sRGB canvas texture, material and plane.
The seeded 2×2-metre atlas repeats 20 times across 40 metres: four subtly different
rubber tiles with white/beige fragments and 3 mm seams. Trilinear mipmaps and up to
8× hardware-supported anisotropy suppress shimmer. The surface sits at scene
Y = −0.6 mm below the rack datum (CAD Z = 0 rotates into scene Y = 0).
The floor is a scene sibling, never a child of the assembly: dimensions, picking,
collisions, fit bounds and rack-only exports therefore exclude it.

One 2048² directional shadow map is cached (`shadow.autoUpdate = false`) and refit
only after a rack rebuild. Ghosts cannot cast shadows. Teardown explicitly releases
the shadow render target and all three floor resources. No texture generation or
texture uploads occur in the steady render loop; the floor adds one draw call.
Part/library/thumbnail scenes retain their neutral backgrounds.

Open `/scripts/visuals-check.html` with the dev server for browser integration checks:
three scene create/dispose cycles, 12 finish changes per cycle, 60 idle frames without
texture uploads, exact GPU texture create/delete balance, borrowed brush disposal,
floor disposal, GLB texture/UV/clearcoat retention and floor exclusion.

## Lighting and clipping (#27)

Builder, part studies and catalog thumbnails use `createStudioLighting`: ACES filmic
mapping at exposure 1, environment intensity 0.8, warm key intensity 2, cool fill 0.4,
and neutral hemisphere 0.45. Paint is a dielectric (metalness 0, roughness 0.55), even
when original CAD materials suggest metalness 0.55. Bare stainless and clear-grind
steel use metalness 1. Fasteners and non-frame semantic roles remain separate.
Part studies keep the neutral grid and a transparent shadow catcher; they do not get
rubber flooring. Thumbnails share display/lighting/PBR but omit shadows. Reference
comparison GLBs keep authored materials. Three r186's PCFShadowMap is the filtered
implementation; deprecated PCFSoftShadowMap is not used.

Material behavior follows the official [MeshPhysicalMaterial docs](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
and [GLTFExporter extension support](https://threejs.org/docs/pages/GLTFExporter.html).
