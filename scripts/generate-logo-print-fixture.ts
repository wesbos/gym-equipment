/** Real CAD fixture for verifying custom stencil cuts through slicer round trips. */
import Module from 'manifold-3d';
import { mkdirSync, writeFileSync } from 'node:fs';
import { definitions } from '../rack-generator/catalog.ts';
import { createAssembly, replaceStructurePart, resolveAssembly } from '../rack-generator/assembly.ts';
import { finalizeLogo } from '../rack-generator/logos/contours.ts';
import { textContours } from '../rack-generator/logos/sources.ts';
import { exportPrint3MF } from '../src/exports/print-3mf.ts';
const directory = process.argv[2] ?? '.verification'; mkdirSync(directory,{recursive:true});
const api = await Module(); api.setup();
const doc = replaceStructurePart(createAssembly({emptyAccessories:true}),'rear-crossmember','nameplate');
const source = {kind:'text' as const,text:'BOS',font:'helvetiker' as const};
doc.logo=finalizeLogo(api,source,textContours(source),true);
doc.removed=[...new Set(resolveAssembly(doc).map(r=>r.ownerId))].filter(id=>!['rear-left','rear-right','rear-crossmember'].includes(id));
const result=exportPrint3MF(api,doc,definitions,{layout:'laid-out'});
writeFileSync(`${directory}/logo.3mf`,result.bytes);
writeFileSync(`${directory}/logo.json`,JSON.stringify(doc,null,2));
console.log(JSON.stringify(result.report));
