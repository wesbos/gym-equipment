# REP ARES 2.0 reference photographs

Twelve original JPEGs preserved for [issue #64](https://github.com/wesbos/gym-equipment/issues/64), copied unchanged from `/tmp/gym-wave4/ares2-reference` on 2026-09-17. The issue originally downloaded these to `/var/folders/h5/_yhcw8cs4ps057dq0z9gjy780000gn/T/opencode/ares2/`. Photos are REP Fitness product photography, not repository-authored artwork; their preservation here does not imply an open-source image license.

Primary source: [REP ARES 2.0 product page](https://repfitness.com/products/ares-2-0-builder). The following filenames/alt descriptions were checked against the live page. Shopify links below omit resizing/version query parameters.

| Local file | REP original |
| --- | --- |
| stack-top.jpg | [Ares2.0-ProductFeature-27.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-ProductFeature-27.jpg) |
| cable-low-point.jpg | [Ares2.0-ProductFeature-13.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-ProductFeature-13.jpg) |
| trolley-closeup.jpg | [Ares2.0-ProductFeatures-25.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-ProductFeatures-25.jpg) |
| low-row-pulleys.jpg | [Ares2.0-ProductFeature2-30-Edit.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-ProductFeature2-30-Edit.jpg) |
| full-rack-6post.jpg | [Ares2.0-ProductFeature2-32-Edit.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-ProductFeature2-32-Edit.jpg) |
| lat-pulldown.jpg | [Ares2.0-Lifestyle-652-Edit.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-Lifestyle-652-Edit.jpg) |
| lat-bar-rest.jpg | [Ares2.0-ProductFeature-23.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-ProductFeature-23.jpg) |
| pulley-closeup.jpg | [Ares2.0-ProductFeature-26.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-ProductFeature-26.jpg) |
| cable-exercise.jpg | [Ares2.0-Lifestyle-548-Edit_1.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-Lifestyle-548-Edit_1.jpg) |
| front-trolleys-two-athletes.jpg | [Ares2.0-Lifestyle-621-Edit.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-Lifestyle-621-Edit.jpg) |
| low-row-seated.jpg | [Ares2.0-Lifestyle-714-Edit.jpg](https://repfitness.com/cdn/shop/files/Ares2.0-Lifestyle-714-Edit.jpg) |
| product-feature-front.jpg | REP product photography supplied by the issue; exact CDN filename not recovered |

## Routing evidence and limits

[REP assembly instructions, 45-0248-K](https://repcustomerfiles.blob.core.windows.net/publicfiles/Ares-2.0-Assembly-Instructions%20%281%29-compressed.pdf), printed pages 57–60 and 65–68, establish the separate upper and lower circuits and their sequence. Page 58 A explicitly shows the **upper cable anchored to the trolley adjuster and ascending**. Page 66 A/B shows the **working cable entering the swivel from below via the front upright's foot pulley**. Moving that upper anchor to the foot would invent a different mechanism. The former `fy = stackY - 260` is an equalizer location, not the front foot pulley.

The photos establish transverse stack plates/guide pairs (already present), outboard front-upright swivels, paired vertically stacked swivel sheaves, raised centered twin low-row outputs, and routing over the rear header. The lower sheave in each swivel is modeled as a keeper: in the hanging-handle pose the cable is straight alongside it, not artificially bent to invent another connection. The routed upper sheave performs the reversal. The independent left/right stack circuits and dual high/low outputs are retained.

Pulley centers, cheek spacing, rail sections, pivot bearings, header height and footplate details are **reconstructed estimates**, not dimensioned REP CAD or a manufacturing drawing. The reference set does not justify replacing the supported locking-hole range with an arbitrary lower stop; the existing lowest/highest rack locking stations are checked with the revised geometry. Fixed upper and lower paths must clear both the cable and the full wheel, not just pass a line-only topology test. This scoped correction does not certify exact manufacturer dimensions or full dynamic exercise travel.

The floating equalizer retains the previous separated-lane reconstruction. `pulley-closeup.jpg` and the manual show adjacent coaxial upper/lower sheaves; their compact lane spacing and the intervening horizontal transfer pulleys have **not** been redigitized in this change. Narrowing the existing lanes alone would overlap tangent arcs and would fabricate connectivity. This is a known remaining geometric approximation, distinct from the corrected front feed and output swivels.
