# REP Smith: photo audit and discrepancy list (issue #79)

This compares `rack-generator/parts/smith.ts` / `smith-front.ts` as of `239353e` against the photos in this folder, REP's Rev B assembly manual (45-010005-B) and the CAD elevation in REP's overview video. **Status** records what the fidelity pass changed. Anything not listed as fixed is still an estimate.

Validated dimensions I kept: 1880 mm bar, 35 mm shaft, 289.5 mm sleeves, 396–1721/2029 mm travel, 16/19 racking positions, 176.50 mm upper extension, 658.35 mm FFE 2.0, and the `smithLayout` guide, carriage, bar and mount frames (`barHeight` is still the shaft centre, and collision boxes and bolt metadata are unchanged).

## Upright / catch ladder

| # | Photo evidence | Before | Status |
| --- | --- | --- | --- |
| 1 | `studio-front-pair.jpg`, `front-mount-racking-carriage.jpg`, `video-safety-adjust-ladder.jpg`: the ladder is **inboard** of the guide rod | 30 × 30 box 53 mm **outboard** of the rod | **Fixed.** Ladder now sits 40–95 mm inboard of the guide axis |
| 2 | Same photos plus the Rev B cover: the ladder is **two drilled side plates plus a closed back**, with chrome rungs spanning between the plates | A solid bar with 72 mm pins sticking out of it | **Fixed.** Two 6 mm plates 95 mm deep, a rear web, and rungs spanning the plates |
| 3 | `safety-stop-closeup.jpg`, `studio-front-pair.jpg`: countersunk rung screws on the plate faces, and a column of small rectangular holes toward the rear edge | One end-cap disc per pin | **Fixed.** Countersunk heads on both outer faces (fastener finish) and 9 mm square holes at a 44.45 mm pitch (the pitch is an estimate) |
| 4 | Rev B p. 2 (main structure assembly), `front-extension-upper-mount.jpg`, `inside-rack-lunge-lower-mount.jpg`: welded end plates carry the guide collar and both ladder plates, and M8 screws fix them to the L-bracket flange | The guide clamp floated at the deck; no end plate | **Fixed.** Tilted end plates with M8 screws, and guide collars moved clear of the plate |
| 5 | `inside-rack-lunge-lower-mount.jpg`, Rev B steps 6/12: the guide foot sits above the side crossmember / FFE rather than well inboard of it. The bar collar sits just outboard of the carriage (`front-mount-racking-carriage.jpg`: guide to collar ≈ 54 mm) | Guide at ±529 mm, leaving ~110 mm of bare shaft between carriage and collar | **Fixed.** Guide at ±575 mm (`SMITH_GUIDE_X`). The flange bearing ends 2 mm inside the collar (tested) |

## Carriage

| # | Photo evidence | Before | Status |
| --- | --- | --- | --- |
| 6 | `video-cad-carriage-side.jpg` (REP CAD) and `hook-closeup-branding.jpg`: an enclosed black linear-bearing **tube** on the guide, a triangular gusset reaching forward, and a bolted flange bearing carrying the bar | Two exposed rings plus a rectangular 150 × 180 plate | **Fixed.** 174 mm bearing tube with seals, gussets inboard and outboard (the outboard one keeps the name `Carriage side plate`), and a two-bolt flange bearing |
| 7 | The CAD flange bearing looks ~120 mm across | n/a | **Reduced.** At 0° the layout puts the guides 125.4 mm behind the front-post centre. A full-size flange would hit the post's rear face, so the gusset stops at local y −86 and the flange at r 27 mm with a vertical two-bolt ear. Tested against the post envelope |
| 8 | Photos show no lever; the bar is rotated by hand | Chrome "Bar rotation lever" | **Removed** |

## Hooks

| # | Photo evidence | Before | Status |
| --- | --- | --- | --- |
| 9 | `hook-closeup-branding.jpg`, `inside-rack-bench-hooks.jpg`, `front-mount-racking-carriage.jpg`: a **bare brushed-steel** plate welded to a bar collar. It leans back from the bar, ends in a catch beak with a notch, and has a black composite layer showing proud of its outline | Small 9-point black profile outboard of the carriage, plus a loose liner box | **Fixed.** Traced plate on the bar between the ladder plates, with the notch, the REP-cutout slot (a plain slot) and a welded collar. Finish role is `sleeve` (polished). There is one inboard composite liner 2 mm proud of the steel outline |
| 10 | The hook is inboard of the carriage and swings between the ladder plates | Hook outboard of the rod, no ladder relationship | **Fixed and tested.** The hook plane lies strictly between the plates, and the hook, liner and carriage clear every rung and plate at 396/1100/max bar heights and −5/0/+5°. It is posed unlatched (beak 12 mm in front of the rungs) |
| 11 | Exact outline and notch radius of the REP hook, and the "REP" lettering | — | **Estimate.** The profile is traced by eye; no logo geometry is modelled (repo policy) |

## Safety stops

| # | Photo evidence | Before | Status |
| --- | --- | --- | --- |
| 12 | `safety-stop-closeup.jpg`, `video-safety-adjust-ladder.jpg`: a turned black composite bumper on top of a ribbed clamp collar, with an octagonal **C-tab wrapping the ladder plate edge** | Plain rings plus a 100 mm pin straight through the guide rod | **Fixed.** 45 mm bumper (top still +45 mm, so `SMITH_SAFETY_GAP` is unchanged), four-groove clamp, and a C-tab slotted around the outer ladder plate. The pin now crosses the tab instead of the rod |

## Finish roles (#27 lighting)

| # | Evidence | Before | Status |
| --- | --- | --- | --- |
| 13 | Smith is sold in one finish (product JSON has no colour option). `inside-rack-bench-wide.jpg`, `inside-rack-lunge-lower-mount.jpg`: black Smith inside a stainless rack | Uprights, carriage and stops used `frame`, so they followed rack paint (default green) | **Fixed.** Authored metallic black (`#353739`, `source` role) that ignores rack paint (tested). Guides, rungs and bar are `rod`; hook and sleeves are `sleeve`; bumpers, seals and hook liner are `liner` |
| 14 | FFE 2.0 and the extension brackets are rack structure | `frame` | **Kept** on `frame`, so they match the rack colour (see PR "Decisions") |

## Front adapters (FFE 2.0 / upper extension)

| # | Photo evidence | Before | Status |
| --- | --- | --- | --- |
| 15 | `ffe2-studio-pair.jpg`, `ffe2-installed-foot.jpg`, Rev B steps 9–12: level drilled run at lower-crossmember height, a **45° drop**, then a floor run with a rounded, drilled toe plate. No leveling screw (the "leveling feature" is the slotted plate) | Straight 658 mm tube with leveling pad and screw, plus two gussets | **Fixed.** Hollow 3 mm-wall side-profile extrusion, sole/toe plate with anchor bolt, 658.35 mm overall (tested). Holes only along the level run |
| 16 | `ffe2-mount-plate-slot.jpg`, `front-extension-bracket-studio.jpg`: tall mounting plate with chamfered corners and vertical oval slots above and below the tube | Short plate with round holes | **Fixed** |
| 17 | `front-extension-bracket-studio.jpg`: the upper bracket has **only two lateral holes** (one keyed) and a chamfered REP composite end cap with a recessed panel | Drilled on every pitch on two axes, flat plug | **Fixed** (keyway not modelled). Volume test confirms two holes |
| 18 | FFE static collision box | 75 × 658 × 75 box at beam height | **Unchanged** (`systems.ts` is shared). The foot drop below the box is a known envelope gap |

## Still open / estimated

- Guide-to-post datum (`smithLayout`, 62.5 mm): photos suggest REP carries the bar further from the post. The layout contract was left alone because mounts, collision boxes and tests depend on it. The `Sleeve shoulder collar` (r 40) already came within 27.5 mm of the post face at 0° before this pass; it was not changed here.
- Rung pitch still follows the published 16/19 positions over 396 mm to max travel. The rung height relative to a latched hook is not modelled.
- Plate thicknesses, gusset outline, bearing tube length and hook outline are photo-scaled estimates, not REP CAD dimensions.
