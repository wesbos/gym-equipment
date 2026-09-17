import type { RackDoc } from '../../rack-generator/types.ts';
import type { PrintLayout } from './print-3mf.ts';
import type { PrintRequest, PrintResponse } from './print-worker.ts';

export type ExportFormat = 'glb' | '3mf';
export const FORMAT_KEY = 'bos-strength-export-format';
export function readExportFormat(storage: Pick<Storage, 'getItem'>): ExportFormat {
  try { return storage.getItem(FORMAT_KEY) === '3mf' ? '3mf' : 'glb'; }
  catch { return 'glb'; }
}
export function rememberExportFormat(storage: Pick<Storage, 'setItem'>, format: ExportFormat) {
  try { storage.setItem(FORMAT_KEY, format); } catch { /* Private browsing may deny storage. */ }
}

type PrintWorker = Pick<Worker, 'onmessage' | 'onerror' | 'postMessage' | 'terminate'>;
type Dependencies = {
  createWorker: () => PrintWorker;
  exportGLB: () => Promise<ArrayBuffer>;
  download: (blob: Blob, filename: string) => void;
  status: (message: string, error?: boolean) => void;
  busy: (format: ExportFormat | null) => void;
  complete: () => void;
};

/** One active export; invalidation guards callbacks already queued when a worker is terminated. */
export class ExportJob {
  private active: { format: ExportFormat; worker?: PrintWorker } | null = null;
  constructor(private deps: Dependencies) {}

  async start(format: ExportFormat, doc: RackDoc, layout: PrintLayout) {
    if (this.active) return;
    const job = { format } as NonNullable<ExportJob['active']>;
    this.active = job;
    this.deps.busy(format);
    const current = () => this.active === job;
    const finish = () => {
      job.worker?.terminate();
      this.active = null;
      this.deps.busy(null);
    };
    const fail = (error: unknown) => {
      if (!current()) return;
      finish();
      this.deps.status(`${format === '3mf' ? 'Print' : 'GLB'} export failed: ${error instanceof Error ? error.message : String(error)}`, true);
    };
    try {
      if (format === 'glb') {
        this.deps.status('Preparing GLB…');
        const data = await this.deps.exportGLB();
        if (!current()) return;
        this.deps.download(new Blob([data], { type: 'model/gltf-binary' }), 'bos-strength-rack.glb');
        finish();
        this.deps.status('Rack exported as GLB.');
        this.deps.complete();
        return;
      }
      this.deps.status('Building watertight print volumes…');
      const worker = this.deps.createWorker();
      job.worker = worker;
      worker.onerror = event => fail(new Error(event.message));
      worker.onmessage = ({ data }: MessageEvent<PrintResponse>) => {
        if (!current()) return;
        if (data.type === 'progress') {
          this.deps.status(`Preparing print parts ${data.done}/${data.total}…`);
          return;
        }
        if (data.type === 'error') { fail(new Error(data.error)); return; }
        try {
          this.deps.download(new Blob([data.bytes], { type: 'model/3mf' }), 'bos-strength-print-parts.3mf');
          finish();
          this.deps.status(`3MF exported: ${data.report.instances} parts, ${data.report.volumes} watertight volumes · millimetres, 100% scale.${data.report.occludedComponents.length ? ` ${data.report.occludedComponents.length} fully covered components omitted (see archive report).` : ''}`);
          this.deps.complete();
        } catch (error) { fail(error); }
      };
      worker.postMessage({ doc: structuredClone(doc), options: { layout } } satisfies PrintRequest);
    } catch (error) { fail(error); }
  }

  cancel() {
    if (this.active?.format !== '3mf') return;
    this.dispose();
    this.deps.busy(null);
    this.deps.status('Print export cancelled.');
  }

  dispose() {
    this.active?.worker?.terminate();
    this.active = null;
  }
}
