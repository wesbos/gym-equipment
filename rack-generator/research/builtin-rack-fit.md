# Built-in attachments on real rack profiles (#162)

The BOS J-hooks (standard, roller, sandwich), box, pin-and-pipe and webbing safeties, spotter arm, dip horn, adjustable dip bar, landmine, monolift, single bar holder and short/long storage pins were reconstructed around a 75 mm tube with 25 mm holes on a 50 mm pitch. The rack profiles from #130 use other posts, so these parts now fit any profile by adapting only their mount.

## What adapts

| Rack property | Built-in response |
|---|---|
| Tube depth along the mount normal (2″ or 3″; 2×3 posts are 3″ deep on the front and back faces and 2″ deep on the sides) | The mating face stays where it is. The sleeve, collar or studs behind it shrink or grow to the new depth, and back plates and rear nuts move with the far face. |
| Tube width across the face | Parts that wrap the tube (J-hooks, spotter arm, monolift, dip horn, adjustable dip bar) bring their side plates in or out to the new width. Face-plate parts (landmine, bar holder, storage pins) are left as they are. |
| Hole pitch (50.8 mm, 76.2 mm) | Multi-bolt patterns move each bolt to the nearest whole station and keep them distinct: landmine 150 → 152.4 mm, bar holder 100 → 101.6 / 76.2 mm, adjustable dip bar 50/200/250 → 50.8/203.2/254 mm (2″) or 76.2/228.6/304.8 mm (3″). |
| Hole bore | Rack-crossing pins, studs and bolts (with their on-axis nuts, washers and heads) take the rack's hardware class: 5/8″ (checked as 15.5 mm) in 5/8″–11/16″ holes, 1″ (24.8 mm) in 1″–1-1/16″ holes, the same classes the rack-part registry uses. Plate bores follow the rack bore. |
| Side-hole stride (Titan 6″) | Transverse pins must cross real side holes, so on Titan side faces only every third station accepts them. |

Safeties center their saddles on the post (tube size along the safety, including 2×3 depth), size cheeks and liners to the tube across, and use the rack pin and bore. A saved pin-and-pipe `pinDiameter` still wins. Safeties need a rear post, so squat stands and the wall rack refuse them with a clear message; spotter arms cover that job there.

## How

`mount-fit.ts` is a pure, monotone, piecewise-linear map in each part's source frame (tube centre, mount normal, stations). A 15 mm rigid core around the tube centre and around every station keeps pins, bores and nuts round; only the bands between the core and the tube faces stretch, and everything beyond the faces shifts rigidly. The builder (`parts/attachments.ts`) first resizes the rack-crossing hardware in the source profile data, then warps each solid: hardware on a station axis stays rigid about that axis, small pieces move with their centre, and the rest follows the map. The same map places anchors, bolt stations, collision bodies and bar cradle rest points. Fit parameters (`fitDepth`, `fitWidth`, `fitPin`, `fitPitch`; `uprightSpan`, `rackPin`, `rackHole` on safeties) exist only in resolved builder params. Saved documents never carry them, and 75 mm racks never get them, so every existing 75 mm document resolves and builds exactly as before.

## Checks (`builtin-rack-fit.test.ts`)

- Every built-in places on every featured non-75 mm starter (Rogue, Titan, REP, Kraken), validates, round-trips and resolves with a pin that fits the bore.
- For each distinct part fit, the solids are valid, bear on the post faces, and intrude into the drilled post no more than the source already does on its own 75 mm post. The source liners and the dip-horn collar floor overlap their post slightly.
- Bolt patterns snap to the pitch, and anchors keep the mating face while the upright centre moves.
- J-hooks and monolifts form cradles on every starter, and a barbell parks in them, seated on the fitted cup without penetrating it.
- 75 mm racks carry no fit params and keep their source anchors and bodies. A main-versus-branch comparison of resolved documents and built geometry across all 75 mm presets with every placeable built-in showed no differences.

## Estimates

These are reconstructions: real 2×2 and 2×3 accessories are separate products with their own plates. The fitted parts keep BOS plate thicknesses, liners and working bodies and only move the plates that bear on the tube. Hardware grows or shrinks in proportion to the pin class, so M16 nuts become roughly 1″ nuts.
