import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { facesInside, wallFrames, WALL_IDS, type Room, type WallFrame, type WallOpening } from '../../rack-generator/walls.ts';
import { resolveFinishes, type ResolvedSurface } from '../../rack-generator/room-finishes.ts';
import type { Vec2 } from '../../rack-generator/types.ts';
import { BIRCH_SHEET_MM } from './finish-textures.ts';
import { RoomMaterials } from './room-scenery.ts';

type Rect = { min: Vec2; max: Vec2 };
/** The band `from`–`to` mm high across the whole wall, minus the openings: a few rectangles in wall [u, h]. */
export function wallRects(length: number, from: number, to: number, openings: readonly Rect[]): Rect[] {
  const cuts = openings.filter(o => o.min[1] < to && o.max[1] > from);
  const us = [...new Set([-length / 2, length / 2, ...cuts.flatMap(o => [o.min[0], o.max[0]])])].filter(u => u >= -length / 2 && u <= length / 2).sort((a, b) => a - b);
  const rects: Rect[] = [];
  for (let i = 0; i + 1 < us.length; i++) {
    const [u0, u1] = [us[i], us[i + 1]], mid = (u0 + u1) / 2;
    const holes = cuts.filter(o => o.min[0] < mid && o.max[0] > mid).map(o => [Math.max(from, o.min[1]), Math.min(to, o.max[1])]).sort((a, b) => a[0] - b[0]);
    let h = from;
    for (const [a, b] of holes) { if (a > h) rects.push({ min: [u0, h], max: [u1, a] }); h = Math.max(h, b); }
    if (h < to) rects.push({ min: [u0, h], max: [u1, to] });
  }
  return rects;
}

/** Flat wall panels on `frame` for `rects` (wall [u, h]), `offset` mm in front of the mounting plane. With `sheet`, UVs
 * count plywood sheets from the wall's left end (seen from inside), so seams land every 1220 mm. */
function panels(frame: WallFrame, rects: readonly Rect[], offset: number, sheet = false) {
  const [nx, nz] = frame.normal, parts = rects.map(({ min, max }) => {
    const geometry = new THREE.PlaneGeometry(max[0] - min[0], max[1] - min[1]), uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      const u = min[0] + uv.getX(i) * (max[0] - min[0]) + frame.length / 2, h = min[1] + uv.getY(i) * (max[1] - min[1]);
      uv.setXY(i, sheet ? u / BIRCH_SHEET_MM[0] : u / frame.length, sheet ? h / BIRCH_SHEET_MM[1] : h / frame.height);
    }
    geometry.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, 0);
    return geometry;
  });
  const geometry = parts.length > 1 ? mergeGeometries(parts) : parts[0] ?? new THREE.BufferGeometry();
  if (parts.length > 1) for (const part of parts) part.dispose();
  geometry.rotateY(Math.atan2(nx, nz));
  geometry.translate(frame.center[0] + nx * offset, 0, frame.center[1] + nz * offset);
  return geometry;
}

/** Room walls (#85, finishes #200): the mounting planes for wall parts, drawn per wall as black slats (the default),
 * painted drywall, birch plywood or a birch wainscot under paint, with window and door openings cut out. They render only
 * from inside the room (dollhouse cut-away), so the default 3D view sees the back and left walls. Scenery only: outside
 * the assembly/export root. Rebuilt only when the room size, a wall finish or an opening changes; paint is a uniform. */
export function createGymWalls(shared?: RoomMaterials) {
  const materials = shared ?? new RoomMaterials(), owned = !shared;
  const group = new THREE.Group();
  group.name = 'Gym walls (scenery only)';
  const slat = new THREE.BoxGeometry(52, 1, 28);
  let walls: { group: THREE.Group; frame: WallFrame; dispose(): void }[] = [], key = '';
  function slats(frame: WallFrame, wall: THREE.Group, openings: readonly Rect[]) {
    const count = Math.floor(frame.length / 75), [nx, nz] = frame.normal, angle = Math.atan2(nx, nz);
    // Each slat runs floor to ceiling, split around any opening it crosses.
    const dark: [number, number, number][] = [], wood: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const u = (i - (count - 1) / 2) * 75;
      // An opening that clips any part of a slat stops the whole slat width.
      const crossing = openings.filter(o => o.min[0] < u + 26 && o.max[0] > u - 26).map((o): Rect => ({ min: [-26, o.min[1]], max: [26, o.max[1]] }));
      for (const { min, max } of wallRects(52, 0, frame.height, crossing)) (i % 19 === 0 ? wood : dark).push([u, min[1], max[1]]);
    }
    const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), scale = new THREE.Vector3();
    for (const [list, material] of [[dark, materials.slat], [wood, materials.accent]] as const) {
      const mesh = new THREE.InstancedMesh(slat, material, list.length);
      // Slat faces sit on the mounting plane; the backing plane is 28 mm behind them.
      list.forEach(([u, h0, h1], i) => mesh.setMatrixAt(i, matrix.compose(new THREE.Vector3(frame.center[0] + frame.along[0] * u - nx * 14, (h0 + h1) / 2, frame.center[1] + frame.along[1] * u - nz * 14), rotation, scale.set(1, h1 - h0, 1))));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      wall.add(mesh);
    }
    wall.add(new THREE.Mesh(panels(frame, wallRects(frame.length, 0, frame.height, openings), -28), materials.backing));
  }
  function surface(frame: WallFrame, finish: ResolvedSurface, wall: THREE.Group, openings: readonly Rect[]) {
    const paint = materials.paint[frame.id], band = (from: number, to: number) => wallRects(frame.length, from, to, openings);
    // Flat finishes sit 2 mm behind the mounting plane so flush wall parts never z-fight with them.
    if (finish.finish === 'slat') slats(frame, wall, openings);
    else if (finish.finish === 'drywall') wall.add(new THREE.Mesh(panels(frame, band(0, frame.height), -2), paint));
    else if (finish.finish === 'birch') wall.add(new THREE.Mesh(panels(frame, band(0, frame.height), -2, true), materials.birch));
    else {
      const top = finish.wainscot, [nx, nz] = frame.normal;
      const caps = band(top, top + 22).map(({ min, max }) => {
        const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], 14);
        g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, 5);
        return g;
      });
      wall.add(new THREE.Mesh(panels(frame, band(0, top), -2, true), materials.birch), new THREE.Mesh(panels(frame, band(top, frame.height), -2), paint));
      if (caps.length) {
        const cap = new THREE.Mesh(caps.length > 1 ? mergeGeometries(caps) : caps[0], paint);
        if (caps.length > 1) for (const g of caps) g.dispose();
        cap.geometry.rotateY(Math.atan2(nx, nz)); cap.geometry.translate(frame.center[0], 0, frame.center[1]);
        cap.name = `${frame.label} wainscot cap`;
        wall.add(cap);
      }
    }
  }
  function build(room: Room, openings: readonly WallOpening[]) {
    for (const wall of walls) wall.dispose();
    const finish = resolveFinishes(room, room.height);
    walls = Object.values(wallFrames(room)).map(frame => {
      const wall = new THREE.Group(), own = finish.surfaces[frame.id];
      wall.name = `${frame.label} ${own.finish === 'slat' ? 'slats' : own.finish}`;
      surface(frame, own, wall, openings.filter(o => o.wall === frame.id));
      wall.traverse(o => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
      group.add(wall);
      return { group: wall, frame, dispose() {
        wall.removeFromParent();
        wall.traverse(o => { if (o instanceof THREE.InstancedMesh) o.dispose(); else if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      } };
    });
  }
  let disposed = false;
  return {
    group,
    /** Show walls (while wall parts exist or are being placed, or a wall finish is chosen); rebuild when a wall moves,
     * its finish changes or an opening moves. */
    update(room: Room, visible: boolean, openings: readonly WallOpening[] = []) {
      group.visible = visible;
      const { surfaces } = resolveFinishes(room, room.height);
      for (const id of WALL_IDS) materials.paint[id].color.set(surfaces[id].color);
      const shape = WALL_IDS.map(id => [surfaces[id].finish, surfaces[id].finish === 'wainscot' ? surfaces[id].wainscot : 0]);
      const next = JSON.stringify([room.back, room.left, room.right, room.front, room.height, shape, openings.map(o => [o.wall, o.min, o.max])]);
      if (visible && next !== key) { key = next; build(room, openings); }
    },
    /** Hide each wall whose room-facing side is away from the camera. */
    follow(camera: THREE.Camera) {
      const p = camera.position;
      for (const wall of walls) wall.group.visible = facesInside(wall.frame, [p.x, p.y, p.z]);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const wall of walls) wall.dispose();
      group.removeFromParent();
      slat.dispose();
      if (owned) materials.dispose();
    },
  };
}
