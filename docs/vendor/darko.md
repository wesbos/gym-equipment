# Darko Lifting reconstruction and attribution

Official sources checked 2026-09-17:
- https://darkolifting.com/products/the-barbell-anchor
- https://darkolifting.com/products/the-dock
- https://darkolifting.com/products/double-decker-barbell-anchor
- Official product gallery images and product JSON from those same URLs.
- Wordmark source: https://darkolifting.com/cdn/shop/files/index_logo_darko_lifting_1a7dbf5e-49d8-4750-9e6b-6490756a0cfb.png?v=1664225008

Darko Lifting — darkolifting.com · Designed & fabricated in USA
Darko Lifting® products shown with credit; designs © Darko Lifting

The wordmark contours in `parts/vendor-assets/darko-wordmark.ts` are traced from
the official white-on-transparent website artwork, retaining the distinctive
split D and shaped letterforms. The profile is extruded 0.7 mm and included in
every product's closed Manifold solids. This is a vendor mark, independent from
user artwork/BOS nameplates. The wordmark is applied as an embossed credit;
its placement is reconstructed, not a claim that the physical products use the
full wordmark at that location (the photographed products use the split-D mark).

Anchor: 9 inch height, 8.3 inch width, 3/16 inch steel, .234 inch liner.
Double Decker: 13.5 inch height, same width/steel, .25 inch lower liner.
Dock: 8 inch gusset height, 3/16 inch steel; bare Dock, Dock+J and Dock+Double-J
are separate selectable variants with shared modular gusset/fastener interfaces.
The projected hook width, contours, bends, fasteners and hole datums are estimated
from photographs. No CAD, fabrication drawing or certified fit is claimed.
Published dimensions bound the reconstruction; specialty-bar envelopes are not
modeled. These cradles hold bars horizontally across paired supports, with
staggered storage heights (the issue's “vertically, sleeve-first” is not followed).

Anchor top-bearing lips rest on the upper crossmember. Their horizontal through
bolts coincide with the existing side perforations, rather than drilling fictional
vertical holes. Typed crossmember-top targets identify a stable connection ID,
station index and side. They resolve the actual beam height, including REP's
151.6 mm flange. Only straight perforated upper crossmembers are offered.
Paired targets must align across parallel rails at equal heights. Every physical
instance depends on its edge and both uprights. Removal cascades via the graph.

The central nominal 1-inch anchor bore accepts either reconstructed shaft size.
The unused flanking nominal 5/8 bores remain modeled. Dock bolts use two main
upright stations of separation (100 / 101.6 mm); the secondary 1-inch bore and
small attachment fixing holes are separate features. Pin/bolt selection rejects
24.8 mm shafts on PR4000's 15.875 mm bores. This does not certify physical fit.

All three vendor product pages recommend six-post racks or bolted racks. Guidance
is shown for all Darko variants. Active post count is known; verified floor
anchoring is not modeled, so the UI never assumes it. Product finishes affect
plates only, liner colors affect liners, and hardware finishes affect fasteners.

Exports: `vendorAttribution(partId)` provides vendor, URL, credit, trademark and
reconstruction disclosure. GLB groups carry that object in userData/extras.
3MF integration should copy it into metadata while retaining every wordmark mesh.
