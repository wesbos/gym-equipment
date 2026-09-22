import * as THREE from 'three';
import { resolveFinishes, type TurfLane } from '../../rack-generator/room-finishes.ts';
import { WALL_IDS, type Room, type WallId } from '../../rack-generator/walls.ts';
import { birchTexture, stencilTexture, turfTexture, TURF_TILE_MM, type Canvas2D } from './finish-textures.ts';

const texture = ({ canvas }: Canvas2D, name: string, anisotropy: number) => {
  const t = new THREE.CanvasTexture(canvas);
  t.name = name; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, anisotropy);
  return t;
};
/** A 1 × 1 white stand-in map: prewarm links the textured programs before any finish texture is drawn. */
function placeholder() {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  return t;
}

/** Long-lived room materials (#200), shared by every wall, ceiling and turf rebuild. Switching finishes only swaps
 * which of these a mesh uses and changes their colour uniforms, so no shader program is ever relinked (#189).
 * Textured ones are drawn lazily on first use; `standIns` gives prewarm the same program variants up front. */
export class RoomMaterials {
  readonly slat = new THREE.MeshStandardMaterial({ color: '#232625', roughness: .94, metalness: 0, envMapIntensity: .3 });
  readonly accent = new THREE.MeshStandardMaterial({ color: '#b4a080', roughness: .86, metalness: 0, envMapIntensity: .3 });
  readonly backing = new THREE.MeshStandardMaterial({ color: '#0e1211', roughness: 1 });
  /** Painted drywall (and the wainscot cap), one per wall so each can take its own colour as a uniform. */
  readonly paint: Record<WallId, THREE.MeshStandardMaterial> = Object.fromEntries(WALL_IDS.map(id => [id, new THREE.MeshStandardMaterial({ color: '#f2f1ec', roughness: .92, metalness: 0, envMapIntensity: .35 })])) as Record<WallId, THREE.MeshStandardMaterial>;
  readonly ceiling = new THREE.MeshStandardMaterial({ color: '#f4f4f1', roughness: .95, metalness: 0, envMapIntensity: .35 });
  /** Linear LED lens: emissive, so it reads as lit without adding a light (a new light would relink every program). */
  readonly led = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 2.2, roughness: .6, metalness: 0 });
  readonly ledHousing = new THREE.MeshStandardMaterial({ color: '#d9dadb', roughness: .5, metalness: .2 });
  private textured = new Map<string, THREE.Material>();
  private textures: THREE.Texture[] = [];
  private stand: THREE.Texture | null = null;
  constructor(private anisotropy = 8) {}
  private lazy<M extends THREE.Material>(key: string, make: () => M): M {
    let m = this.textured.get(key) as M | undefined;
    if (!m) { m = make(); this.textured.set(key, m); }
    return m;
  }
  private birchParams = { roughness: .82, metalness: 0, envMapIntensity: .35 };
  get birch() {
    return this.lazy('birch', () => {
      const map = texture(birchTexture(), 'Birch plywood sheet 1220 × 2440', this.anisotropy);
      this.textures.push(map);
      return new THREE.MeshStandardMaterial({ ...this.birchParams, map });
    });
  }
  /** Turf and its lines are Lambert + map like the rubber floor, so they share its program. */
  get turf() {
    return this.lazy('turf', () => {
      const map = texture(turfTexture(), 'Sports turf 1 m', this.anisotropy);
      this.textures.push(map);
      return new THREE.MeshLambertMaterial({ map, color: '#c8c8c8', reflectivity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    });
  }
  get turfLines() {
    return this.lazy('turf-lines', () => new THREE.MeshLambertMaterial({ map: this.placeholder(), color: '#e4e6e0', reflectivity: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  }
  /** Painted turf lettering, one alpha-tested texture per word (the same program for every word). */
  stencil(text: string) {
    return this.lazy(`stencil:${text}`, () => {
      const map = texture(stencilTexture(text), `Turf stencil ${text}`, this.anisotropy);
      map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      this.textures.push(map);
      return new THREE.MeshLambertMaterial({ ...this.stencilParams, map });
    });
  }
  private stencilParams = { color: '#e4e6e0', reflectivity: 0, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };
  private placeholder() { return this.stand ??= placeholder(); }
  /** Materials with the exact program parameters of every room surface, as [material, instanced]; `release` frees
   * the stand-ins made here (the shared materials stay). */
  standIns(): { materials: [THREE.Material, boolean][]; release(): void } {
    const map = this.placeholder(), made = [new THREE.MeshStandardMaterial({ ...this.birchParams, map }), new THREE.MeshLambertMaterial({ map, reflectivity: 0 }), new THREE.MeshLambertMaterial({ ...this.stencilParams, map }),
      // The plain studio ground (gym-floor.ts): Lambert without a map.
      new THREE.MeshLambertMaterial({ reflectivity: 0 })];
    return {
      materials: [[this.slat, true], [this.accent, true], [this.backing, false], [this.paint.back, false], [this.ceiling, false], [this.led, false], [this.ledHousing, false], ...made.map((m): [THREE.Material, boolean] => [m, false])],
      release: () => { for (const m of made) m.dispose(); },
    };
  }
  dispose() {
    for (const m of [this.slat, this.accent, this.backing, ...Object.values(this.paint), this.ceiling, this.led, this.ledHousing, ...this.textured.values()]) m.dispose();
    for (const t of this.textures) t.dispose();
    this.stand?.dispose();
    this.textured.clear(); this.textures = [];
  }
}

/** A floor plane whose UVs are in `tile` mm, so a shared repeating texture keeps its physical scale on any size. */
function floorQuad(width: number, depth: number, tile: number) {
  const geometry = new THREE.PlaneGeometry(width, depth), uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / tile, uv.getY(i) * depth / tile);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
/** Painted hash marks every metre down the lane's long axis, 200 mm in from each edge (as on sled/sprint turf). */
export function turfLineGeometry(lane: TurfLane) {
  const [w, d] = lane.size, alongX = w >= d, length = alongX ? w : d, width = alongX ? d : w;
  const marks: THREE.BufferGeometry[] = [], mark = Math.min(420, width / 4), inset = Math.min(200, width / 8);
  const count = Math.max(0, Math.floor((length - 400) / 1000) + 1);
  for (let k = 0; k < count; k++) for (const side of [-1, 1]) {
    const s = (k - (count - 1) / 2) * 1000, across = side * (width / 2 - inset - mark / 2), g = new THREE.PlaneGeometry(alongX ? 90 : mark, alongX ? mark : 90);
    g.rotateX(-Math.PI / 2);
    g.translate(alongX ? s : across, 0, alongX ? across : s);
    marks.push(g);
  }
  const merged = marks.length ? mergePlanes(marks) : new THREE.BufferGeometry();
  for (const g of marks) g.dispose();
  return merged;
}
function mergePlanes(parts: THREE.BufferGeometry[]) {
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], index: number[] = [];
  for (const g of parts) {
    const base = positions.length / 3;
    positions.push(...g.getAttribute('position').array); normals.push(...g.getAttribute('normal').array); uvs.push(...g.getAttribute('uv').array);
    index.push(...Array.from(g.getIndex()!.array, i => i + base));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(index);
  return out;
}

/** Room ceiling, its linear LEDs and turf lanes (#200). Scenery only, rebuilt only when these finishes change.
 * The ceiling faces down (back-face culled from above) and hides whenever the camera is outside or above the room,
 * so the default orbit views look straight in. */
export function createRoomScenery(materials: RoomMaterials) {
  const group = new THREE.Group(), ceiling = new THREE.Group(), turf = new THREE.Group();
  group.name = 'Room finishes (scenery only)'; ceiling.name = 'Room ceiling'; turf.name = 'Turf lanes';
  group.add(ceiling, turf);
  let ceilingKey = '', turfKey = '', box: { minX: number; maxX: number; minZ: number; maxZ: number; height: number } | null = null;
  const release = (root: THREE.Group) => {
    const used = new Set<THREE.BufferGeometry>();
    for (const o of [...root.children]) { o.removeFromParent(); if (o instanceof THREE.Mesh) used.add(o.geometry); }
    for (const g of used) g.dispose();
  };
  function buildCeiling(room: Room) {
    release(ceiling);
    const f = resolveFinishes(room, room.height);
    box = null;
    if (!f.ceiling) return;
    materials.ceiling.color.set(f.ceiling.color);
    // Light bounced off the floor and walls: a faint glow so a painted ceiling doesn't read as grey from below.
    materials.ceiling.emissive.set(f.ceiling.color).multiplyScalar(f.ceiling.lights ? 0.3 : 0.1);
    const minX = -room.left, maxX = room.right, minZ = -room.back, maxZ = room.front, width = maxX - minX, depth = maxZ - minZ;
    box = { minX, maxX, minZ, maxZ, height: room.height };
    const plane = new THREE.PlaneGeometry(width, depth);
    plane.rotateX(Math.PI / 2); // Front face down, into the room.
    const mesh = new THREE.Mesh(plane, materials.ceiling);
    mesh.name = 'Ceiling'; mesh.position.set((minX + maxX) / 2, room.height, (minZ + maxZ) / 2);
    ceiling.add(mesh);
    const lights = f.ceiling.lights;
    if (!lights) return;
    const alongX = lights.along === 'x', run = (alongX ? width : depth) - 1200, span = alongX ? depth : width;
    const lens = new THREE.BoxGeometry(alongX ? run : 70, 14, alongX ? 70 : run), housing = new THREE.BoxGeometry(alongX ? run + 40 : 90, 30, alongX ? 90 : run + 40);
    for (let i = 0; i < lights.count; i++) {
      const across = (alongX ? minZ : minX) + span * (i + 0.5) / lights.count;
      const x = alongX ? (minX + maxX) / 2 : across, z = alongX ? across : (minZ + maxZ) / 2;
      const body = new THREE.Mesh(housing, materials.ledHousing), light = new THREE.Mesh(lens, materials.led);
      body.position.set(x, room.height - 15, z); light.position.set(x, room.height - 33, z);
      body.name = light.name = `Linear LED ${i + 1}`;
      ceiling.add(body, light);
    }
  }
  function buildTurf(lanes: TurfLane[]) {
    release(turf);
    lanes.forEach((lane, i) => {
      const [x, z] = lane.position, [w, d] = lane.size;
      const mesh = new THREE.Mesh(floorQuad(w, d, TURF_TILE_MM), materials.turf);
      mesh.name = `Turf lane ${i + 1}`; mesh.position.set(x, 0.4, z); mesh.receiveShadow = true;
      turf.add(mesh);
      if (lane.text) {
        // Across the lane, near both ends of a long lane (the centre of a short one), reading from the +x / +z end.
        // A quarter-turn `textRotation` runs the word along the lane instead, sized to the lane's width.
        const turn = lane.textRotation ?? 0, sideways = turn === 90 || turn === 270;
        const alongX = w >= d, length = alongX ? w : d, width = alongX ? d : w;
        const across = sideways ? Math.min(width * 1.25, 4000) : Math.min(width * 0.8, 4000), deep = across / 4, reach = sideways ? across : deep;
        const spots = length >= 5000 ? [-1, 1].map(side => side * (length / 2 - 1500 - reach / 2)) : [0];
        for (const s of spots) {
          const g = new THREE.PlaneGeometry(across, deep);
          g.rotateX(-Math.PI / 2);
          if (alongX) g.rotateY(Math.PI / 2);
          if (turn) g.rotateY(turn * Math.PI / 180);
          const stencil = new THREE.Mesh(g, materials.stencil(lane.text));
          stencil.name = `Turf lane ${i + 1} ${lane.text}`; stencil.receiveShadow = true;
          stencil.position.set(x + (alongX ? s : 0), 1.1, z + (alongX ? 0 : s));
          turf.add(stencil);
        }
      }
      if (lane.lines) {
        const lines = new THREE.Mesh(turfLineGeometry(lane), materials.turfLines);
        lines.name = `Turf lane ${i + 1} lines`; lines.position.set(x, 0.9, z); lines.receiveShadow = true;
        turf.add(lines);
      }
    });
  }
  let disposed = false;
  return {
    group,
    /** Rebuild only the parts whose finishes changed. */
    update(room: Room) {
      const f = resolveFinishes(room, room.height);
      const nextCeiling = JSON.stringify([f.ceiling, room.left, room.right, room.back, room.front, room.height]);
      if (nextCeiling !== ceilingKey) { ceilingKey = nextCeiling; buildCeiling(room); }
      const nextTurf = JSON.stringify(f.turf);
      if (nextTurf !== turfKey) { turfKey = nextTurf; buildTurf(f.turf); }
    },
    /** Show the ceiling only from inside the room, below it. */
    follow(camera: THREE.Camera) {
      const p = camera.position;
      ceiling.visible = !!box && p.x > box.minX && p.x < box.maxX && p.z > box.minZ && p.z < box.maxZ && p.y < box.height;
    },
    /** True when the ceiling is drawn from this camera position. */
    get ceilingVisible() { return ceiling.visible && ceiling.children.length > 0; },
    dispose() {
      if (disposed) return;
      disposed = true;
      release(ceiling); release(turf);
      group.removeFromParent();
    },
  };
}
