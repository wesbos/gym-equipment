/** Procedural room-finish textures (#200), drawn once on a canvas when a finish is first used: no image assets.
 * Every texture tiles seamlessly; sizes are physical so the scene can set UVs or repeats in millimetres. */
import type { FloorFinish } from '../../rack-generator/room-finishes.ts';

export interface Canvas2D { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }
export function canvas2d(width: number, height = width): Canvas2D {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return { canvas, context: canvas.getContext('2d')! };
}
/** Deterministic LCG so every visit draws the same room. */
export function seeded(seed: number) {
  return () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
}
/** Tileable value noise on an n × n lattice (wraps at the canvas edge). */
function lattice(n: number, random: () => number) {
  const values = Float32Array.from({ length: n * n }, random);
  return (u: number, v: number) => {
    const x = u * n, y = v * n, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const at = (i: number, j: number) => values[((j % n + n) % n) * n + ((i % n + n) % n)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

/** Physical size (mm) one texture repeat covers. */
export const FLOOR_TILE_MM: Record<FloorFinish, number> = {
  'black-rubber': 2000, 'grey-fleck': 2000, 'blue-fleck': 2000, 'light-fleck': 2000, wood: 2000, concrete: 4000,
};
/** Material colour the floor texture is multiplied by (the black rubber keeps its tuned #909090). */
export const FLOOR_TINT: Record<FloorFinish, string> = {
  'black-rubber': '#909090', 'grey-fleck': '#f0f0f0', 'blue-fleck': '#b8b8b8', 'light-fleck': '#dcdcdc', wood: '#d0d0d0', concrete: '#d2d2d2',
};

/** The original black rubber tile atlas (#85): 1 m tiles with recessed joints and pale flecks. */
function blackRubber({ context }: Canvas2D) {
  const random = seeded(261709), pixels = context.createImageData(1024, 1024);
  // Diffuse-only, so the base carries the brightness the old GGX sheen used to add (~0.03 albedo, real black rubber).
  const shades = [80, 82, 79, 81];
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const shade = shades[Math.floor(y / 512) * 2 + Math.floor(x / 512)] + Math.floor(random() * 10);
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
    context.fillStyle = '#434545'; context.fillRect(p, 0, 1.5, 1024); context.fillRect(0, p, 1024, 1.5);
    context.fillStyle = '#707272'; context.fillRect(p + 1.5, 0, 0.5, 1024); context.fillRect(0, p + 1.5, 1024, 0.5);
  }
}

/** Rolled EPDM fleck rubber: a speckled base with dense, contrasting granules (2 mm per pixel). */
const FLECKS: Record<'grey-fleck' | 'blue-fleck' | 'light-fleck', { base: [number, number, number]; count: number; colors: [string, number][] }> = {
  // PLAE-style grey: salt and pepper, about a third of the surface in pale granules.
  'grey-fleck': { base: [100, 103, 106], count: 95000, colors: [['#e8e8e4', 6], ['#cacbc8', 4], ['#a6a8a7', 3], ['#3a3c3e', 2]] },
  'blue-fleck': { base: [44, 46, 49], count: 60000, colors: [['#3f73c2', 5], ['#5e93dc', 3], ['#2c528f', 3], ['#b9bdc0', 1]] },
  'light-fleck': { base: [150, 152, 153], count: 90000, colors: [['#f3f3f0', 5], ['#dcdcd8', 3], ['#6d7073', 3], ['#45484b', 2]] },
};
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function fleckRubber({ context }: Canvas2D, finish: keyof typeof FLECKS) {
  const spec = FLECKS[finish], random = seeded(finish.length * 7919 + 17), pixels = context.createImageData(1024, 1024), data = pixels.data;
  // Soft mottling (64 px cells, sampled every 8 px: it only moves a few levels) plus per-pixel grain.
  const mottle = lattice(16, random), coarse = new Float32Array(129 * 129);
  for (let y = 0; y <= 128; y++) for (let x = 0; x <= 128; x++) coarse[y * 129 + x] = (mottle(x / 128, y / 128) - 0.5) * 8;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const n = coarse[(y >> 3) * 129 + (x >> 3)] + (random() - 0.5) * 10, i = (y * 1024 + x) * 4;
    data[i] = spec.base[0] + n; data[i + 1] = spec.base[1] + n; data[i + 2] = spec.base[2] + n; data[i + 3] = 255;
  }
  const palette = spec.colors.flatMap(([color, weight]) => Array<number[]>(weight).fill(rgb(color)));
  // Granules rasterised straight into the pixels (2 × 2 supersampled coverage), wrapping at the edges so the repeat
  // has no seam. Far quicker than canvas paths for tens of thousands of specks.
  for (let k = 0; k < spec.count; k++) {
    // 1–3 mm granules at 2 mm a pixel: fine enough to read as fleck, not gravel.
    const cx = random() * 1024, cy = random() * 1024, a = 0.45 + random() ** 2 * 1.15, b = a * (0.45 + random() * 0.5), t = random() * Math.PI;
    const color = palette[Math.floor(random() * palette.length)], cos = Math.cos(t), sin = Math.sin(t), r = Math.ceil(a);
    for (let py = Math.floor(cy) - r; py <= Math.floor(cy) + r; py++) for (let px = Math.floor(cx) - r; px <= Math.floor(cx) + r; px++) {
      let inside = 0;
      for (let q = 0; q < 4; q++) {
        const dx = px + (q & 1 ? 0.75 : 0.25) - cx, dy = py + (q & 2 ? 0.75 : 0.25) - cy, u = (dx * cos + dy * sin) / a, v = (dy * cos - dx * sin) / b;
        if (u * u + v * v <= 1) inside++;
      }
      if (!inside) continue;
      const i = ((py & 1023) * 1024 + (px & 1023)) * 4, w = inside / 4;
      for (let c = 0; c < 3; c++) data[i + c] += (color[c] - data[i + c]) * w;
    }
  }
  context.putImageData(pixels, 0, 0);
}

/** Sealed concrete slab: soft mottling, fine grain, sparse aggregate and a saw-cut control joint every 4 m. */
function concrete({ context }: Canvas2D) {
  const random = seeded(90210), pixels = context.createImageData(1024, 1024);
  const low = lattice(6, random), mid = lattice(24, random), fine = lattice(96, random), coarse = new Float32Array(256 * 256);
  // The broad mottling changes slowly: sample it every 4 px.
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) coarse[y * 256 + x] = (low(x / 256, y / 256) - 0.5) * 26 + (mid(x / 256, y / 256) - 0.5) * 14;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const n = coarse[(y >> 2) * 256 + (x >> 2)] + (fine(x / 1024, y / 1024) - 0.5) * 8 + (random() - 0.5) * 9;
    const i = (y * 1024 + x) * 4, shade = 150 + n;
    pixels.data[i] = shade + 2; pixels.data[i + 1] = shade + 1; pixels.data[i + 2] = shade - 2; pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  for (let i = 0; i < 2600; i++) {
    const x = random() * 1024, y = random() * 1024, r = 0.3 + random() * 0.9;
    context.fillStyle = random() < 0.6 ? '#7d7b77' : '#b9b7b1';
    context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle = '#6f6d69'; context.fillRect(0, 0, 1.2, 1024); context.fillRect(0, 0, 1024, 1.2);
}

/** Wood platform boards: 125 mm oak-tone boards along x, staggered butt joints, grain and per-board tone. */
function wood({ context }: Canvas2D) {
  const random = seeded(4242), rows = 16, rowPx = 1024 / rows;
  for (let row = 0; row < rows; row++) {
    // Boards run on from an offset and each is drawn twice (at x and x − 1024), so rows wrap without a common joint.
    const start = random() * 600;
    for (let x = start; x < start + 1024;) {
      const length = Math.min(300 + random() * 700, start + 1024 - x), tone = random(), streaks = Array.from({ length: 14 }, () => [2 + random() * (rowPx - 4), 0.05 + random() * 0.12, 0.6 + random() * 1.2]);
      for (const at of [x, x - 1024]) {
        context.fillStyle = `rgb(${176 + tone * 30},${132 + tone * 22},${84 + tone * 14})`;
        context.fillRect(at, row * rowPx, length, rowPx);
        // Long grain: thin darker streaks along the board.
        for (const [y, alpha, h] of streaks) { context.fillStyle = `rgba(92,58,28,${alpha})`; context.fillRect(at, row * rowPx + y, length, h); }
        context.fillStyle = 'rgba(60,38,18,0.55)'; context.fillRect(at, row * rowPx, 1.2, rowPx);
      }
      x += length;
    }
    context.fillStyle = 'rgba(60,38,18,0.6)'; context.fillRect(0, row * rowPx, 1024, 1.2);
  }
}

export function floorTexture(finish: FloorFinish): Canvas2D {
  const target = canvas2d(1024);
  if (finish === 'black-rubber') blackRubber(target);
  else if (finish === 'concrete') concrete(target);
  else if (finish === 'wood') wood(target);
  else fleckRubber(target, finish);
  return target;
}

/** One 4 × 8 ft birch plywood sheet (1220 × 2440 mm, grain running up the sheet): pale face veneer with long grain,
 * soft figure, a dark seam where it meets the next sheet and a perimeter of screw heads. */
export const BIRCH_SHEET_MM = [1220, 2440] as const;
export function birchTexture(): Canvas2D {
  const target = canvas2d(512, 1024), { context } = target, random = seeded(1220);
  const pixels = context.createImageData(512, 1024), figure = lattice(8, random), streak = lattice(64, random);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 512; x++) {
    // Grain: stretched noise, much finer across the sheet than along it.
    const g = streak(x / 512, y / 4096 * 8) - 0.5, f = figure(x / 512, y / 1024) - 0.5;
    const n = g * 16 + f * 14 + (random() - 0.5) * 5, i = (y * 512 + x) * 4;
    pixels.data[i] = 221 + n; pixels.data[i + 1] = 193 + n * 0.95; pixels.data[i + 2] = 161 + n * 0.85; pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  // Occasional pin knots and darker lines typical of B/BB birch faces.
  for (let i = 0; i < 9; i++) {
    const x = random() * 512, y = random() * 1024;
    context.fillStyle = 'rgba(150,108,64,0.35)';
    context.beginPath(); context.ellipse(x, y, 1.5 + random() * 2, 3 + random() * 5, 0, 0, Math.PI * 2); context.fill();
  }
  // Seam: a 6 mm shadowed reveal on the left and bottom edges (the neighbouring sheet supplies the other side), wide
  // enough to survive mipmapping across the room.
  context.fillStyle = 'rgba(92,66,42,0.9)'; context.fillRect(0, 0, 2.5, 1024); context.fillRect(0, 1021.5, 512, 2.5);
  context.fillStyle = 'rgba(150,118,84,0.5)'; context.fillRect(2.5, 0, 1.5, 1024);
  context.fillStyle = 'rgba(255,245,225,0.3)'; context.fillRect(4, 0, 1, 1024);
  // Screws: every 305 mm around the perimeter, 20 mm in from the edges, and down the centre stud.
  const px = 512 / BIRCH_SHEET_MM[0], mmY = 1024 / BIRCH_SHEET_MM[1];
  context.fillStyle = 'rgba(70,64,58,0.9)';
  for (let y = 150; y < BIRCH_SHEET_MM[1]; y += 305) for (const x of [20, BIRCH_SHEET_MM[0] / 2, BIRCH_SHEET_MM[0] - 20]) {
    context.beginPath(); context.arc(x * px, y * mmY, 1.3, 0, Math.PI * 2); context.fill();
  }
  return target;
}

/** Sports turf, 1 m square: bright green blades with light and dark tufts. */
export const TURF_TILE_MM = 1000;
export function turfTexture(): Canvas2D {
  const target = canvas2d(512), { context } = target, random = seeded(777), pixels = context.createImageData(512, 512), tufts = lattice(32, random);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const t = tufts(x / 512, y / 512) - 0.5, n = (random() - 0.5) * 34 + t * 26, i = (y * 512 + x) * 4;
    pixels.data[i] = 104 + n * 0.55; pixels.data[i + 1] = 158 + n; pixels.data[i + 2] = 64 + n * 0.35; pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  for (let i = 0; i < 16000; i++) {
    const x = random() * 512, y = random() * 512, a = random() * Math.PI;
    context.strokeStyle = random() < 0.5 ? 'rgba(170,220,110,0.4)' : 'rgba(34,92,28,0.4)';
    context.lineWidth = 0.7;
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5); context.stroke();
  }
  return target;
}

/** A turf stencil: white block capitals on a transparent 4:1 canvas (alpha-tested, so no blending or sorting). */
export function stencilTexture(text: string): Canvas2D {
  const target = canvas2d(1024, 256), { context } = target, font = (size: number) => `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  context.clearRect(0, 0, 1024, 256);
  context.fillStyle = '#ffffff';
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = font(210);
  const width = context.measureText?.(text)?.width ?? 0;
  if (width > 980) context.font = font(Math.floor(210 * 980 / width));
  context.fillText(text, 512, 134);
  return target;
}
