/// <reference lib="webworker" />
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { catalog } from '../../rack-generator/catalog.ts';
import type { RackDoc } from '../../rack-generator/types.ts';
import { exportPrint3MF, type PrintOptions, type PrintReport } from './print-3mf.ts';
declare const self: DedicatedWorkerGlobalScope;
export interface PrintRequest { doc: RackDoc; options: PrintOptions }
export type PrintResponse = { type:'progress'; done:number; total:number } | {type:'complete'; bytes:Uint8Array<ArrayBuffer>; report:PrintReport} | {type:'error'; error:string};
// Dedicated one-shot worker: no export queue or long-lived CAD cache.
self.onmessage = async ({data}: MessageEvent<PrintRequest>) => {
  self.onmessage = null;
  const send = (data:PrintResponse, transfer:Transferable[]=[])=>self.postMessage(data,transfer);
  try {
    const api = await Module({locateFile:()=>wasmUrl}); api.setup();
    const result = exportPrint3MF(api,data.doc,catalog.definitions,data.options,(done,total)=>send({type:'progress',done,total}),catalog.attribution);
    send({type:'complete',...result},[result.bytes.buffer]);
  } catch (error) { send({type:'error',error:error instanceof Error?error.message:String(error)}); }
};
