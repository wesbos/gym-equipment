# Issue 40 — direct structural placement

Verified in isolated `agent-browser` session `gym-wave2-structure_ui` at `http://127.0.0.1:5313/builder` (1280 × 633). No topology forms were used for placement.

- Choose **75 upright** in the catalog. Hover the front-left post. Only the two outside directions appear; the occupied right/rear directions are absent. ArrowRight and Alt each change the ghost. Click the post: four posts / 14 physical parts become five posts / 17 parts, including both real connecting members. One Undo restores 14 and disables Undo; Redo restores 17.
- Choose **725 mm crossmember**, hover the post, cycle to the lower front span, and click. The graph gains `front-left → front-right`, lower level; parts become 18. One Undo returns 17, Redo returns 18.
- ESC cancels a hovered proposal, removes handles, and preserves 18 parts. A blank invalid area offers no candidate; clicking it preserves 18 parts.
- Drag from a blank area, and separately from a hovered upright with a live proposal: the camera orbits and parts remain 18. Placement takes precedence over ordinary click selection; orbit drags never place.
- Topology details remain collapsed. The inspector retains an explicit Swap choice. Actual worker-built upright and crossmember geometry supplies ghosts and committed models.

Screenshots: `upright-preview.png`, `fifth-upright.png`, `crossmember-preview.png`, `orbit-no-placement.png`.

Pure/store tests additionally cover removed anchors, out-of-bounds cells, intermediate posts, duplicate/existing edges, restoration of removed connections, exact profile pitch/bore/dimensions, immutable proposals, cancellation, mode changes, and atomic history. No private browser store hooks or programmatic document mutation were used for these browser placements; localStorage was read only to verify graph results.

Integration: shares PR39's `PlacementProposal` and ghost renderer. PR37 physical-selection and PR36 vendor-target branches were inspected read-only; neither incomplete branch was cherry-picked. Those branches were not yet on main for this validation. Structural proposals do not introduce or alter attachment Target types.
