# Nighthawk mechanical contact review

Production browser captures at backrest **85°**, seat **20°**:

- [Side view](nighthawk-high-angle.png)
- [Three-quarter view](nighthawk-high-angle-3d.png)

The bench is isolated and painted red to expose its supports. Both upper support endpoints follow their articulated pad rails; lower pins seat in solved closed-ladder stations. `rack-generator/floor-items.test.ts` checks all 28 angle combinations, fixed link lengths, positive link/rail and link/pin CAD contact, no pin/gauge penetration, and gauge contact within 0.1 mm.

`e2e/floor-items.spec.ts` captures these views after checking placement, snapped/unsnapped dragging, rotation, Escape, gesture undo, independent resets, named Save/reload, GLB inclusion, real 3MF exclusion, mixed selection/removal/undo, and permissive overlap warnings. It restores the saved rack after capture.
