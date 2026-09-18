import * as THREE from 'three';
import { facesInside, wallFrames, type Room } from '../../rack-generator/walls.ts';

/** Flat black slat walls (#85) matching the distant backdrop. They are the mounting planes for wall parts
 * and render only from inside the room (dollhouse cut-away), so the default 3D view sees the back and left
 * walls. Scenery only: outside the assembly/export root. Rebuilt only when the room changes. */
export function createGymWalls() {
  const group = new THREE.Group();
  group.name = 'Gym walls (scenery only)';
  const black = new THREE.MeshStandardMaterial({ color: '#232625', roughness: .94, metalness: 0, envMapIntensity: .3 });
  const birch = new THREE.MeshStandardMaterial({ color: '#b4a080', roughness: .86, metalness: 0, envMapIntensity: .3 });
  const backing = new THREE.MeshStandardMaterial({ color: '#0e1211', roughness: 1 });
  const slat = new THREE.BoxGeometry(52, 1, 28);
  let walls: { group: THREE.Group; frame: ReturnType<typeof wallFrames>[keyof ReturnType<typeof wallFrames>]; dispose(): void }[] = [], key = '';
  function build(room: Room) {
    for (const wall of walls) wall.dispose();
    walls = Object.values(wallFrames(room)).map(frame => {
      const wall = new THREE.Group(), count = Math.floor(frame.length / 75), [nx, nz] = frame.normal, angle = Math.atan2(nx, nz);
      wall.name = `${frame.label} slats`;
      const accents = Math.floor((count - 1) / 19) + 1;
      const dark = new THREE.InstancedMesh(slat, black, count - accents), wood = new THREE.InstancedMesh(slat, birch, accents);
      const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), scale = new THREE.Vector3(1, frame.height, 1);
      let d = 0, w = 0;
      for (let i = 0; i < count; i++) {
        const u = (i - (count - 1) / 2) * 75;
        // Slat faces sit on the mounting plane; the backing plane is 28 mm behind them.
        matrix.compose(new THREE.Vector3(frame.center[0] + frame.along[0] * u - nx * 14, frame.height / 2, frame.center[1] + frame.along[1] * u - nz * 14), rotation, scale);
        (i % 19 === 0 ? wood : dark).setMatrixAt(i % 19 === 0 ? w++ : d++, matrix);
      }
      const plane = new THREE.PlaneGeometry(frame.length, frame.height), back = new THREE.Mesh(plane, backing);
      back.position.set(frame.center[0] - nx * 28, frame.height / 2, frame.center[1] - nz * 28);
      back.rotation.y = angle;
      for (const mesh of [dark, wood]) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; }
      back.receiveShadow = true;
      wall.add(dark, wood, back);
      group.add(wall);
      return { group: wall, frame, dispose() { wall.removeFromParent(); dark.dispose(); wood.dispose(); plane.dispose(); } };
    });
  }
  let disposed = false;
  return {
    group,
    /** Show walls (only while wall parts exist or are being placed); rebuild when a wall moves. */
    update(room: Room, visible: boolean) {
      group.visible = visible;
      const next = JSON.stringify(room);
      if (visible && next !== key) { key = next; build(room); }
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
      slat.dispose(); black.dispose(); birch.dispose(); backing.dispose();
    },
  };
}
