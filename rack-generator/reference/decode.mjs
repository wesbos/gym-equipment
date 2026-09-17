import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import {Vector3,Matrix4,Box3} from 'three';
import {definitions as a} from '../parts/structure.js';
import {definitions as b} from '../parts/attachments.js';
import {definitions as c} from '../parts/bars-safeties.js';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const docs={};
for(const file of ['front','storage','panel'])docs[file]=await io.read(fileURLToPath(new URL(`./${file}.glb`,import.meta.url)));
fs.mkdirSync(new URL('./decoded',import.meta.url),{recursive:true});
for(const def of [...a,...b,...c,{id:'upright-2300',reference:{file:'front',node:'Riot upright 2300 left front.006'}}]){
 const root=docs[def.reference.file].getRoot().listNodes().find(n=>n.getName()===def.reference.node);
 if(!root)throw Error(def.id);
 const parts=[];const bounds=new Box3();
 function walk(n){const m=new Matrix4().fromArray(n.getWorldMatrix());for(const prim of n.getMesh()?.listPrimitives()||[]){const pos=prim.getAttribute('POSITION').getArray();const transformed=[];for(let i=0;i<pos.length;i+=3){const v=new Vector3(pos[i],pos[i+1],pos[i+2]).applyMatrix4(m);const mm=new Vector3(v.x*1000,-v.z*1000,v.y*1000);bounds.expandByPoint(mm);transformed.push(...mm.toArray());}parts.push({name:n.getName(),positions:transformed,indices:prim.getIndices()?Array.from(prim.getIndices().getArray()):Array.from({length:pos.length/3},(_,i)=>i),color:prim.getMaterial()?.getBaseColorFactor(),material:prim.getMaterial()?.getName()});}for(const child of n.listChildren())walk(child);}
 walk(root);const center=bounds.getCenter(new Vector3());const origin=[center.x,center.y,bounds.min.z];
 for(const part of parts){const box=new Box3();for(let i=0;i<part.positions.length;i+=3){for(let k=0;k<3;k++)part.positions[i+k]=Number((part.positions[i+k]-origin[k]).toFixed(5));box.expandByPoint(new Vector3(...part.positions.slice(i,i+3)));}part.bounds={min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new Vector3()).toArray()};}
 const data={id:def.id,reference:def.reference,units:'mm',axes:'z up; x source x; y negative source z; centered XY; minimum Z=0',size:bounds.getSize(new Vector3()).toArray(),parts};fs.writeFileSync(new URL(`./decoded/${def.id}.json`,import.meta.url),JSON.stringify(data));console.log(def.id,parts.map(p=>`${p.name} (${p.positions.length/3}v) ${p.bounds.size.map(v=>v.toFixed(1)).join('x')}`).join('; '));
}
