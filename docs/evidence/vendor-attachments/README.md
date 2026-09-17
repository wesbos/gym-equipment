# Vendor attachment verification

Dedicated local browser session `gym-wave2-vendor_attachments`, dev port 5306.
The attached rack JSON imports into the builder and produces 15 physical parts.
Screenshot shows paired VOLTRA sliding mounts, paired top-mounted Double Deckers,
and paired Dock/Double-J parts on the rear uprights. Thumbnails render through
the existing bounded service. Darko inspector exposes typed upper-rail station,
pair target, steel finish, liner and shaft selection, plus vendor guidance.

Browser GLB export: 7,548,492 bytes at verification time; parsed JSON contains
six vendor group attribution objects and four official Darko wordmark nodes.
Those wordmarks are ordinary exported mesh primitives, not textures. No export
binary is checked in. UI/export metadata names the vendor without changing BOS
nameplate branding. Hardware uses existing semantic fastener role.

Automated coverage adds closed manifold/edge checks, all VOLTRA mount/orientation
combinations, bore rejection, fixed/Dock bolt station alignment, typed rail targets,
paired parallel rail alignment, JSON round trips, arbitrary graph IDs, removal,
physical paint IDs on unpair, and manufacturer 50.8 mm rail stations.
