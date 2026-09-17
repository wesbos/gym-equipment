import * as THREE from 'three';

/** Static 2 × 2 metre tile atlas. No render-loop generation or updates. */
export function createGymFloor(anisotropy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d')!;
  let seed = 261709;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const pixels = context.createImageData(1024, 1024);
  const shades = [24, 26, 23, 25];
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const shade = shades[Math.floor(y / 512) * 2 + Math.floor(x / 512)] + Math.floor(random() * 9);
    const i = (y * 1024 + x) * 4;
    pixels.data[i] = shade; pixels.data[i + 1] = shade + 1; pixels.data[i + 2] = shade + 1; pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  for (let i = 0; i < 15000; i++) {
    const x = random() * 1024, y = random() * 1024, size = 0.4 + random() ** 2 * 1.8;
    context.fillStyle = ['#aaa99f', '#bfb9a3', '#d3d1c5', '#85877e', '#6d706c'][Math.floor(random() * 5)];
    context.beginPath();
    context.ellipse(x, y, size, size * (0.5 + random() * 0.4), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  // 3 mm recessed joints, with a faint edge highlight. The repeat boundary is a joint too.
  for (const p of [0, 512]) {
    context.fillStyle = '#0a0b0b'; context.fillRect(p, 0, 1.5, 1024); context.fillRect(0, p, 1024, 1.5);
    context.fillStyle = '#343636'; context.fillRect(p + 1.5, 0, 0.5, 1024); context.fillRect(0, p + 1.5, 1024, 0.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'Rubber gym tile speckles — 2m atlas';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, anisotropy);
  const material = new THREE.MeshStandardMaterial({ map: texture, color: '#909090', roughness: 0.94, metalness: 0, envMapIntensity: 0.15 });
  const geometry = new THREE.PlaneGeometry(40000, 40000);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Gym floor scenery (not exported)';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.6;
  mesh.receiveShadow = true;
  let disposed = false;
  return { mesh, dispose() {
    if (disposed) return;
    disposed = true;
    mesh.removeFromParent(); geometry.dispose(); material.dispose(); texture.dispose();
  } };
}

/** Refit only when rack geometry changes; the shadow map is reused while orbiting. */
export function fitRackShadow(light: THREE.DirectionalLight, bounds: THREE.Box3) {
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(800, bounds.getSize(new THREE.Vector3()).length() / 2 + 100);
  light.target.position.copy(center);
  light.position.copy(center).add(new THREE.Vector3(-1, 2, 2).normalize().multiplyScalar(radius * 3));
  const camera = light.shadow.camera;
  camera.left = camera.bottom = -radius;
  camera.right = camera.top = radius;
  camera.near = radius; camera.far = radius * 5;
  camera.updateProjectionMatrix();
  light.shadow.needsUpdate = true;
}
