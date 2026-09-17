# Beyond Power VOLTRA I reconstruction

Checked 2026-09-17 against official product photos and specifications:
- https://www.beyond-power.com/products/voltra
- https://www.beyond-power.com/products/sliding-rack-mount
- https://www.beyond-power.com/products/adaptive-rack-mount
- https://www.beyond-power.com/products/fixed-rack-mount
- https://help.beyond-power.com/en/articles/13926869-product-manuals
- https://help.beyond-power.com/en/articles/13924029-how-to-use-the-sliding-rack-mount

The device envelope is 323 × 139 × 100 mm. The cable is 3 mm synthetic;
resistance is 5–200 lb and available cable is 2.6 m. Display graphics, radii,
vent positions, outlet, carry handle, magnetic locking rim and mount dimensions
are visual estimates. No internal motor or battery reconstruction is claimed.
The short visible cable represents the parked connector, not a training reach.

Three independently modeled mount variants: split sliding collar with spacer,
transverse height pin and controls; slotted adaptive plate with through pin and
anti-rock knob; raised fixed plate with two slotted bolts. Fixed mounts are sold
in pairs; each catalog instance includes one mount and one device. Matching pair
places two full units. Current rack class is 75 mm; no unsupported rack sizes
are introduced. Shafts are estimated at 15.5 / 24.8 mm to provide clearance for
the nominal 5/8 / 1 inch options. These are visualization estimates, not machining
or load-bearing specifications. The fixed slots accommodate the modeled 50 and
50.8 mm pitch; its bolts use real stations either side of the dock. Sliding uses
a transverse pin and cannot use PR4000's front-only half stations.

Device orientations rotate its geometry about the dock's outward axis, leaving
the rack mount upright. Height checks include the rotated envelope and mount.
All materials carry explicit roles; only screws/bolts/pins use fastener finish.
The titanium connector and dock rim stay source metals; handles stay handles.

Integration: `vendorAttribution(partId)` is the common UI/export credit contract.
Vendor geometry uses the normal library worker and returns ordinary closed
`SolidPart[]`; therefore thumbnails, cache limits, disposal and exports follow
the existing paths. No v2 document migration or appearance changes are required.
