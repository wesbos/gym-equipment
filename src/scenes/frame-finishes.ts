import * as THREE from 'three';
import { resolveMaterial, type Appearance, type MaterialSource } from '../../rack-generator/appearance.ts';

/** Two bounded, lazily-created textures per builder. Materials borrow it. */
export class FrameFinishResources {
  private brush?: THREE.CanvasTexture;
  private normal?: THREE.CanvasTexture;
  constructor(private anisotropy = 1) {}
  private brushMap() {
    if (this.brush) return this.brush;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    let seed = 913;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = '#aaaaaa'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const shade = Math.floor(110 + random() * 140);
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.lineWidth = 0.3 + random() * 0.8;
      const x = random() * 256, y = random() * 256;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 15 + random() * 95, y + random() * 2); ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = 'Directional steel brush';
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, this.anisotropy);
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = normalCanvas.height = 256;
    const normalContext = normalCanvas.getContext('2d')!;
    const heights = ctx.getImageData(0, 0, 256, 256).data;
    const pixels = normalContext.createImageData(256, 256);
    const height = (x: number, y: number) => heights[((y + 256) % 256 * 256 + (x + 256) % 256) * 4] / 255;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const vector = new THREE.Vector3(height(x - 1, y) - height(x + 1, y), height(x, y - 1) - height(x, y + 1), 1).normalize();
      const i = (y * 256 + x) * 4;
      pixels.data[i] = (vector.x * 0.5 + 0.5) * 255;
      pixels.data[i + 1] = (vector.y * 0.5 + 0.5) * 255;
      pixels.data[i + 2] = (vector.z * 0.5 + 0.5) * 255;
      pixels.data[i + 3] = 255;
    }
    normalContext.putImageData(pixels, 0, 0);
    this.normal = new THREE.CanvasTexture(normalCanvas);
    this.normal.name = 'Steel grind normal';
    this.normal.wrapS = this.normal.wrapT = THREE.RepeatWrapping;
    this.normal.anisotropy = texture.anisotropy;
    this.brush = texture;
    return texture;
  }
  material(source: MaterialSource, appearance?: Appearance, instanceId?: string) {
    const resolved = resolveMaterial(source, appearance, instanceId);
    const { finish, ...pbr } = resolved;
    if (!finish) return new THREE.MeshStandardMaterial(pbr);
    const material = new THREE.MeshPhysicalMaterial(pbr);
    if (finish) {
      material.roughnessMap = this.brushMap();
      material.normalMap = this.normal!;
      material.normalScale.setScalar(finish === 'clear-grind' ? 0.55 : 0.12);
      if (finish === 'clear-grind') {
        material.clearcoat = 0.65;
        material.clearcoatRoughness = 0.22;
      }
    }
    return material;
  }
  dispose() { this.brush?.dispose(); this.normal?.dispose(); this.brush = undefined; this.normal = undefined; }
}

/** Planar per-face UVs in millimetres. Standard maps survive GLB export. */
export function addSteelUVs(geometry: THREE.BufferGeometry) {
  if (geometry.hasAttribute('uv')) return;
  const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    uv[2 * i] = (nz > nx && nz > ny ? p.getX(i) : p.getZ(i)) / 180;
    uv[2 * i + 1] = (nx > ny ? p.getY(i) : p.getX(i)) / 40;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
