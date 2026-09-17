/// <reference lib="webworker" />
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { finalizeLogo } from './contours.ts';
import { svgContours, textContours, traceBitmap } from './sources.ts';
import { LOGO_LIMITS, type LogoSource } from './types.ts';
const ready = Module({ locateFile: () => wasmUrl }).then(api => { api.setup(); return api; });
self.onmessage = async ({ data }: MessageEvent<{ source: LogoSource; bridges: boolean }>) => {
  try {
    const { source } = data, api = await ready;
    let loops;
    if (source.kind === 'text') loops = textContours(source);
    else if (source.kind === 'svg') loops = svgContours(api, source.data);
    else {
      if (source.data.length > LOGO_LIMITS.source || !/^data:image\/(png|jpeg);base64,/.test(source.data)) throw Error('Choose a PNG/JPEG smaller than 250 KB.');
      const binary = atob(source.data.split(',')[1]), bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      // Inspect dimensions before native decoding to bound decompression memory.
      const view = new DataView(bytes.buffer); let width = 0, height = 0;
      if (view.getUint32(0) === 0x89504e47 && bytes.length >= 24) { width = view.getUint32(16); height = view.getUint32(20); }
      else if (view.getUint16(0) === 0xffd8) {
        for (let i = 2; i + 8 < bytes.length;) {
          if (bytes[i] !== 255) break;
          const marker = bytes[i + 1], length = view.getUint16(i + 2);
          if ([0xc0, 0xc1, 0xc2].includes(marker)) { height = view.getUint16(i + 5); width = view.getUint16(i + 7); break; }
          if (length < 2) break; i += 2 + length;
        }
      }
      if (!width || !height || width > 4096 || height > 4096 || width * height > 8_000_000) throw Error('Raster must be a PNG/JPEG no larger than 4096 px per side and 8 megapixels.');
      const scale = Math.min(1, 256 / Math.max(width, height)), w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
      const bitmap = await createImageBitmap(new Blob([bytes]), { resizeWidth: w, resizeHeight: h });
      try {
        const canvas = new OffscreenCanvas(w, h), ctx = canvas.getContext('2d')!;
        ctx.drawImage(bitmap, 0, 0, w, h);
        loops = traceBitmap(ctx.getImageData(0, 0, w, h).data, w, h, source.threshold, source.contrast);
      } finally { bitmap.close(); }
    }
    self.postMessage({ logo: finalizeLogo(api, source, loops, data.bridges) });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : String(error) }); }
};
