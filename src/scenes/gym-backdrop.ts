import * as THREE from 'three';

/** A distant circular acoustic wall: four static draw calls, never part of the CAD/export root. */
export function createGymBackdrop() {
  const radius = 12000, height = 9000, count = Math.round(2 * Math.PI * radius / 75);
  const group = new THREE.Group();
  group.name = 'Black acoustic slats and birch accents (scenery only)';
  const rim = new THREE.DirectionalLight('#dce7e2', .75);
  rim.position.set(3000, 4000, -3000);
  rim.target.position.set(0, 1400, 0);
  group.add(rim, rim.target);
  const black = new THREE.MeshStandardMaterial({ color: '#222524', roughness: .94, metalness: 0, envMapIntensity: .3 });
  const birch = new THREE.MeshStandardMaterial({ color: '#b4a080', roughness: .86, metalness: 0, envMapIntensity: .3 });
  const backing = new THREE.MeshStandardMaterial({ color: '#101413', roughness: 1, side: THREE.BackSide });
  const slat = new THREE.BoxGeometry(52, height, 28);
  const accentCount = Math.floor((count - 1) / 19) + 1;
  const darkSlats = new THREE.InstancedMesh(slat, black, count - accentCount);
  const woodSlats = new THREE.InstancedMesh(slat, birch, accentCount);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(1,1,1);
  let darkIndex = 0, woodIndex = 0;
  for (let i = 0; i < count; i++) {
    const angle = i * 2 * Math.PI / count;
    rotation.setFromAxisAngle(new THREE.Vector3(0,1,0), angle);
    matrix.compose(new THREE.Vector3(Math.sin(angle)*radius, height/2+18, Math.cos(angle)*radius), rotation, scale);
    (i % 19 === 0 ? woodSlats : darkSlats).setMatrixAt(i % 19 === 0 ? woodIndex++ : darkIndex++, matrix);
  }
  for (const mesh of [darkSlats, woodSlats]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  const wallGeometry = new THREE.CylinderGeometry(radius+20, radius+20, height, 160, 1, true);
  const wall = new THREE.Mesh(wallGeometry, backing);
  wall.position.y = height/2;
  group.add(wall);
  const skirtingGeometry = new THREE.CylinderGeometry(radius-18, radius-18, 18, 160, 1, true);
  const skirting = new THREE.Mesh(skirtingGeometry, backing);
  skirting.position.y = 9;
  group.add(skirting);
  let disposed = false;
  return {
    group,
    /** Keep the distant background beyond the orbit, including unrestricted zoom and pan.
     * Only its transform changes; the instances/materials are never rebuilt per frame. */
    follow(camera: THREE.Camera, target: THREE.Vector3) {
      const distance = Math.hypot(camera.position.x-target.x, camera.position.z-target.z);
      const spread = Math.max(1, (distance+6000)/radius);
      group.position.set(target.x, 0, target.z);
      group.scale.set(spread, Math.max(1, (camera.position.y+4000)/height), spread);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      darkSlats.dispose(); woodSlats.dispose();
      slat.dispose(); wallGeometry.dispose(); skirtingGeometry.dispose();
      black.dispose(); birch.dispose(); backing.dispose();
    },
  };
}
