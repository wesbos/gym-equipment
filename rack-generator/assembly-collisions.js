// Conservative interference checks for resolved accessories, in millimetres.
// These envelopes cover working bodies, excluding collars, mounting pins and
// washers. Frame joins and the intended accessory-to-post contact are omitted.
// This is a placement aid, not a solid/solid manufacturing clearance check.
const CLEARANCE = 2;
const HOOK_ANCHORS = {
  'j-hook-standard': [8.753, -85.08286, 150.00177],
  'j-hook-roller': [7.9503, -42.38026, 149.9999],
  'j-hook-sandwich': [8.74882, -44.99326, 150.00006],
};
const HOOK_SIZES = {
  'j-hook-standard': [77.508, 267.166, 200],
  'j-hook-roller': [79.412, 181.761, 200],
  'j-hook-sandwich': [77.495, 186.987, 200],
};
const NAMES = {
  'j-hook-standard': 'Standard J-hook',
  'j-hook-roller': 'Roller J-hook',
  'j-hook-sandwich': 'Sandwich J-hook',
  'safety-box': 'Box safety',
  'safety-pin-pipe': 'Pin-and-pipe safety',
  'safety-webbing': 'Webbing safety',
};
const vector = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const number = (v, fallback) => Number.isFinite(v) && v > 0 ? v : fallback;
const box = (min, max) => ({ min, max });
const segmentBox = (a, b, diameter) => box(a.map((v, i) => Math.min(v, b[i]) - diameter / 2),
  a.map((v, i) => Math.max(v, b[i]) + diameter / 2));

function localBodies(instance) {
  // Adapters can supply tighter profiles without coupling this module to WASM.
  if (Array.isArray(instance.collisionBoxes)) return instance.collisionBoxes;
  const p = instance.params || {}, part = instance.part;
  if (HOOK_SIZES[part]) {
    const defaults = HOOK_SIZES[part];
    const size = ['width', 'depth', 'height'].map((key, i) => number(p[key], defaults[i]));
    const anchor = instance.mount?.localAnchor || HOOK_ANCHORS[part].map((v, i) => v * size[i] / defaults[i]);
    // The receiving cup extends +Y beyond the post; the tall rear collar is
    // deliberately absent from this volume. Slot conflicts handle its pin.
    return [box([-size[0] / 2 + 3, anchor[1] + 39, 0],
      [size[0] / 2 - 3, size[1] / 2, Math.min(size[2], anchor[2] - 25)])];
  }
  const length = number(p.length, 1075);
  if (part.startsWith('pullup-')) {
    const half = length / 2 - 20, diameter = number(p.diameter, 32);
    if (part === 'pullup-straight') return [segmentBox([-half, 0, 175], [half, 0, 175], diameter)];
    if (part === 'pullup-multigrip' || part === 'pullup-sphere') {
      const sphere = part === 'pullup-sphere', scale = length / 1075;
      const projection = number(p.projection, sphere ? 190 : 170) / (sphere ? 190 : 170);
      const front = (sphere ? -141.194 : -85) * projection;
      const back = (sphere ? 48.806 : 85) * projection;
      const z = sphere ? 99.639 : 80, outer = 370 * scale;
      const bodies = [segmentBox([-outer, front, z], [outer, front, z], diameter)];
      // Small segments follow bent rails without filling the empty centre.
      const addSegment = (a, b, d = diameter) => {
        const count = Math.max(1, Math.ceil(Math.hypot(...a.map((v, i) => b[i] - v)) / 50));
        for (let i = 0; i < count; i++) bodies.push(segmentBox(
          a.map((v, k) => v + (b[k] - v) * i / count),
          a.map((v, k) => v + (b[k] - v) * (i + 1) / count), d));
      };
      for (const sign of [-1, 1]) {
        for (const y of [front, back]) addSegment([sign * outer, y, z], [sign * half, y, 30]);
        if (sphere) {
          addSegment([sign * outer, back, z], [sign * 200 * scale, back, z]);
          addSegment([sign * 200 * scale, back, z], [0, -134 * projection, z]);
          for (const [x, y, factor] of [[350, 158.806, 1], [200, 108.806, 0.64]]) {
            const center = [sign * x * scale, y * projection, z];
            addSegment([center[0], front, z], center);
            bodies.push(segmentBox(center, center, number(p.sphereDiameter, 125) * factor));
          }
        } else {
          addSegment([sign * 310 * scale, front, z], [sign * 310 * scale, back, z]);
          addSegment([sign * 140 * scale, front, z], [sign * 200 * scale, back, z]);
        }
      }
      if (!sphere) bodies.push(segmentBox([-outer, back, z], [outer, back, z], diameter));
      return bodies;
    }
  }
  if (part === 'safety-box') {
    const width = number(p.width, 75), height = number(p.height, 75);
    return [box([-length / 2 + 5, -width / 2, 0], [length / 2 - 5, width / 2, height + 5])];
  }
  if (part === 'safety-pin-pipe') {
    const r = number(p.pipeDiameter, 45) / 2;
    return [box([-length / 2 + 5, -r, 100 - r], [length / 2, r, 100 + r])];
  }
  if (part === 'safety-webbing') {
    const half = length / 2 - 50, width = number(p.strapWidth, 40);
    const thickness = number(p.strapThickness, 3), sag = number(p.sag, 50);
    const height = x => 53 - (51.5 * (1 - (x / half) ** 2)) * sag / 50;
    // Separate strips preserve the empty space above and below a hanging strap.
    return Array.from({ length: 24 }, (_, i) => {
      const a = -half + 2 * half * i / 24, b = -half + 2 * half * (i + 1) / 24;
      const za = height(a), zb = height(b);
      return box([a, -width / 2, Math.min(za, zb) - thickness / 2],
        [b, width / 2, Math.max(za, zb) + thickness / 2]);
    });
  }
  // An unknown adapter has no inferred envelope: its mounting slot is still
  // checked, and it may opt into body checking through collisionBoxes.
  return [];
}

function worldBodies(instance) {
  const origin = vector(instance.position) ? instance.position : [0, 0, 0];
  const yaw = Number.isFinite(instance.rotation?.[2]) ? instance.rotation[2] : 0;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return localBodies(instance).flatMap(b => {
    if (!vector(b.min) || !vector(b.max) || b.min.some((v, i) => v >= b.max[i])) return [];
    const local = b.min.map((v, i) => (v + b.max[i]) / 2);
    return [{
      center: [origin[0] + local[0] * c - local[1] * s,
        origin[1] + local[0] * s + local[1] * c, origin[2] + local[2]],
      half: b.min.map((v, i) => (b.max[i] - v) / 2),
      axes: [[c, s], [-s, c]],
    }];
  });
}

function intersects(a, b) {
  const delta = a.center.map((v, i) => b.center[i] - v);
  if (Math.min(a.center[2] + a.half[2], b.center[2] + b.half[2])
    - Math.max(a.center[2] - a.half[2], b.center[2] - b.half[2]) <= CLEARANCE) return false;
  // Separating-axis test in XY: unlike a world AABB this does not report
  // false collisions between two long diagonal arms whose bounds cross.
  for (const axis of [...a.axes, ...b.axes]) {
    const dot = v => v[0] * axis[0] + v[1] * axis[1];
    const extent = o => o.half[0] * Math.abs(dot(o.axes[0])) + o.half[1] * Math.abs(dot(o.axes[1]));
    if (extent(a) + extent(b) - Math.abs(dot(delta)) <= CLEARANCE) return false;
  }
  return true;
}

function sharedSlot(a, b) {
  const mounts = instance => Array.isArray(instance.mounts) ? instance.mounts : instance.mount ? [instance.mount] : [];
  for (const x of mounts(a)) for (const y of mounts(b)) {
    if (x?.uprightId && x.uprightId === y?.uprightId && Number.isFinite(x.hole) && x.hole === y.hole) return x;
  }
  return null;
}

/** Return one warning per interfering pair of resolved accessory instances. */
export function detectCollisions(resolvedInstances) {
  if (!Array.isArray(resolvedInstances)) return [];
  const instances = resolvedInstances.filter(i => i && typeof i.id === 'string' && i.kind === 'accessory' && i.collisionEnabled !== false);
  const bodies = new Map(instances.map(i => [i, worldBodies(i)]));
  const warnings = [], seen = new Set();
  for (let i = 0; i < instances.length; i++) for (let j = i + 1; j < instances.length; j++) {
    const a = instances[i], b = instances[j];
    if (a.id === b.id) continue;
    const key = JSON.stringify([a.id, b.id].sort());
    if (seen.has(key)) continue;
    const slot = sharedSlot(a, b);
    const overlap = slot || bodies.get(a).some(x => bodies.get(b).some(y => intersects(x, y)));
    if (!overlap) continue;
    const name = v => v.name || NAMES[v.part] || String(v.part || 'Accessory').replaceAll('-', ' ');
    warnings.push({ ids: [a.id, b.id], message: slot
      ? `${name(a)} and ${name(b)} share mounting hole ${slot.hole} on ${slot.uprightId}.`
      : `${name(a)} and ${name(b)} have overlapping working bodies. Move one to another hole or face.` });
    seen.add(key);
  }
  return warnings;
}
