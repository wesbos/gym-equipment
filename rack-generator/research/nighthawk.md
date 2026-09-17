# REP Nighthawk AB-4102 reconstruction

Sources checked 2026-09-17:
- [REP product and technical specifications](https://repfitness.com/products/rep-nighthawk-adjustable-bench)
- [REP dimension drawing](https://cdn.arenacommerce.com/repfitnessco/AB-4100%202.0%20-%20Dimensions%20Line%20Drawing.png)
- [REP rear-frame photograph](https://repfitness.com/cdn/shop/files/AB-4100_2.0_-_Moody_Shoot_-_205-Edit.jpg?v=1743693283&width=1445)
- [Official assembly manual, revision V4](https://repcustomerfiles.blob.core.windows.net/publicfiles/Nighthawk-Assembly-Instructions)
- [Official spares sheet](https://repcustomerfiles.blob.core.windows.net/publicfiles/Nighthawk%20Spares%20Sheet)

Published dimensions: 51 × 25.9 inches footprint; 16.7 inches flat pad height; back pad 36 × 11.8 inches, seat 13 inches long, gap 1.57 inches. Seven back angles 0/15/30/45/60/75/85°, four seat angles −15/0/10/20°. Product specification tolerance is 3%; its dimension drawing labels width 25.8 rather than 25.9 inches. Use rounded millimetre targets (1295 × 658, 424 high, 914 × 300 back, 330 seat, 40 gap).

Geometry uses Manifold tube shells, rounded pad profiles, tapered seat, closed cut-out ladder gauges, supports, forked wheels, knurled carrying handle, storage bumper, and socket fasteners. Secondary steel section sizes and hidden linkages are reconstructed estimates, not manufacturer CAD or fabrication instructions. Pads and liners have nonmetallic soft PBR, gauges retain their dark finish, and fasteners have authored black nickel unless the user explicitly applies a global hardware finish. No source meshes or manufacturer logos are embedded.

Both support upper endpoints use the same pivot transform as their pad rails, including the attachment's local height offset. Reconstructed fixed-length links (450 mm back, 115 mm seat) determine the discrete ladder stations. All 28 settings verify actual CAD contact between links, rails and pins; pins fit without penetrating the gauges and sit within 0.1 mm of the slot floor. These checks establish continuity of the reconstruction, not a manufacturer-certified mechanism.

## Coordinates and ownership

`RackDoc.floorItems` is optional and additive. Each item has its own stable `floor-*` identity, part, floor position `[worldX, worldZ]` in mm, world Y rotation in radians, and validated pad angles. It has no rack node/edge dependencies. Rack graph changes preserve this list; explicit whole-design resets can replace the entire document.

CAD remains Z-up. Local X is bench width, local +Y points toward the back-pad head, local Z is height. The source origin is the footprint centre on the floor. Resolver uses `[worldX, -worldZ, 0]`, rotation `[0, 0, worldYRotation]`. Scene root X rotation of −π/2 maps source `[x,y,z]` to Three `[x,z,-y]`. GLB uses that same scene transform. The explicit resolved `kind: 'floor-item'` is the print exclusion contract: exclude before building CAD or generating plate metadata.

Collision checks use conservative rotated AABBs against the rack footprint and other floor items. They are warnings, not physical simulation or placement blockers. Floor dragging snaps to 25 mm by default; Alt bypasses snap. R rotates 15°, Shift-R reverses. Escape rolls back the full active gesture; committed pointer gestures consume one undo entry. Mixed physical selection supports painting and owner-safe removal without exposing rack mount controls for benches.
