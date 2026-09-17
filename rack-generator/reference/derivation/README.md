# Source geometry analysis

Run from the project root. `../decode.mjs` decodes original GLB components to measured, z-up millimetre coordinates. `attachments.py` uses Python with numpy, trimesh, shapely, scipy and networkx to derive 2D extrusion sections, axial lathe profiles, and cylinder centerlines; output is `/tmp/attachment-profiles.json`. This data is embedded as CAD profiles in `parts/attachments.js`. No source triangle geometry is loaded by the Manifold builders.

`structure-sections.py` records the plane-intersection/loop-stitching helper used for structural outlines. `structure-profile-selection.py` records the selections of lettering, floor pads, flange outlines and other profiles from the temporary section files used during the reconstruction session. It is provenance for those selections, not a standalone regeneration command. The final selected profiles are embedded in `parts/structure.js`.

The originals and decoded measurements remain unbranded references. BOS STRENGTH lettering belongs to the generated models and is independent of original reference lettering.
