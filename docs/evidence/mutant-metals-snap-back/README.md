# Mutant Metals Snap-Back Roller — photo revision

[Photo comparison](comparison.png) · [previous side view](before-side.png) · [revised part viewer](viewer-side.png)

The four `reference-*.png` images were supplied by the user for this revision. The model is independently reconstructed; the undocumented dimensions are photo estimates.

| Reference | Revised render | Features checked |
| --- | --- | --- |
| [Blue, loose](reference-1.png) | [Blue three-quarter](blue-photo1.png) | Exposed curved web, edge protection, welded seams, roller, rear pin and lower clasp |
| [Black, loaded](reference-2.png) | [Opposite black side](black-photo2.png) | Beam/leg proportions, pivot location, arm arc and inclined catch |
| [Black/red, mounted](reference-3.png) | [Black/red three-quarter](black-red-photo3.png) | Deep top beam, narrow rear leg, MM windows, round bearing caps and arm clearance |
| [Blue pair](reference-4.png) | [Opposite blue side](blue-photo4.png) | Opposite-side construction, lower wrap, metal mounting pin and roller pocket |

Additional [side](side.png) and [front](front.png) views check the silhouette and hollow arm construction. The renders are generated from the actual catalog worker meshes using the app's Three.js studio lighting and creased normals. Camera perspectives approximate the reference views; the loose parts and installed parts have different poses.

Three geometry/render passes corrected the frame proportions and curve, then tightened the arm/frame clearance, then exposed the coloured arm web between narrow black edge strips. The MM marks are actual through-cuts in the steel, replacing the former rectangular badge. The nylon roller, catch, axle and lip rotate together, and the bar cradle follows the roller's surface normal.

Published dimensions retained: 3/8 in steel and 2-1/4 in usable roller length. Estimated: 330 × 280 mm frame; 245 mm pivot offset from the rack face; 42 mm roller diameter; −32° roller inclination; roller centre 115 mm out and 199 mm below the mounting pin. Small welds and hardware are simplified. This is a visual reconstruction, not fabrication CAD.

Validation:

- All 14 J-cup/safety/monolift family tests pass, including every finish/pin option's closed printable mesh and 3MF export.
- New geometry checks verify open MM windows, the hollow arm, its connection to the tray, roller length along its inclined axis, placement/collision bounds, and a parked bar tangent to the nylon without clipping steel or liners.
- All three prebuilt-thumbnail checks pass; the Snap-Back thumbnail was regenerated.
- TypeScript check passes. The actual part viewer builds 12 solids / 6,054 triangles.
