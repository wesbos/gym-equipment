import type { DecodedSource } from './types.ts';
import fs from 'node:fs';
import Module from 'manifold-3d';
import {definitions as structure} from '../parts/structure.ts';
import {definitions as attachments} from '../parts/attachments.ts';
import {definitions as bars} from '../parts/bars-safeties.ts';
const api=await Module();api.setup();const report=[];
for(const def of [...structure,...attachments,...bars]){
 const source: DecodedSource=JSON.parse(fs.readFileSync(new URL(`./decoded/${def.id}.json`,import.meta.url), 'utf8'));
 const params={...def.defaults};if(def.id==='upright')params.height=1800;
 const solids=def.build(api,params),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 try{for(const {solid} of solids){const mesh=solid.getMesh();for(let i=0;i<mesh.vertProperties.length;i+=mesh.numProp)for(let k=0;k<3;k++){min[k]=Math.min(min[k],mesh.vertProperties[i+k]);max[k]=Math.max(max[k],mesh.vertProperties[i+k]);}}}finally{solids.forEach(p=>p.solid.delete());}
 const size=max.map((v,k)=>v-min[k]),ref=source.size;
 const orientations=[size,[size[1],size[0],size[2]]];
 const aligned=orientations.sort((a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-ref[i])/ref[i],0)-b.reduce((s,v,i)=>s+Math.abs(v-ref[i])/ref[i],0))[0];
 const error=aligned.map((v,i)=>100*Math.abs(v-ref[i])/ref[i]);
 report.push({id:def.id,sourceSize:ref,rebuildSize:aligned,errorPercent:error,params});
 console.log(`${def.id}: ${aligned.map(v=>v.toFixed(1)).join('×')} / source ${ref.map(v=>v.toFixed(1)).join('×')} mm; difference ${error.map(v=>v.toFixed(1)+'%').join(', ')}`);
}
fs.writeFileSync(new URL('./fidelity-report.json',import.meta.url),JSON.stringify(report,null,2));
