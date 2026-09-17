import type { InventoryGLTF } from './types.ts';
import fs from 'node:fs';
import {Matrix4,Quaternion,Vector3,Box3} from 'three';
const report: {file:string;node:string;size:number[];center:number[]}[]=[];
for(const file of ['front','storage']) {
 const b=fs.readFileSync(new URL(`./${file}.glb`,import.meta.url)); const j: InventoryGLTF=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 const matrices=j.nodes.map(n=>n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3(...(n.translation||[0,0,0])),new Quaternion(...(n.rotation||[0,0,0,1])),new Vector3(...(n.scale||[1,1,1]))));
 function bounds(i: number,parent=new Matrix4()): Box3{const n=j.nodes[i],m=parent.clone().multiply(matrices[i]),box=new Box3();if(n.mesh!==undefined)for(const p of j.meshes[n.mesh].primitives){const a=j.accessors[p.attributes.POSITION];if(a.min && a.max)box.union(new Box3(new Vector3(...a.min),new Vector3(...a.max)).applyMatrix4(m));}for(const c of n.children||[])box.union(bounds(c,m));return box;}
 for(let i=0;i<j.nodes.length;i++){const n=j.nodes[i];if(n.mesh===undefined&&n.children?.some(c=>j.nodes[c].mesh!==undefined)){const box=bounds(i);report.push({file,node:n.name,size:box.getSize(new Vector3()).toArray().map(v=>Math.round(v*1000)),center:box.getCenter(new Vector3()).toArray().map(v=>Math.round(v*1000))});}}
}
fs.writeFileSync(new URL('./inventory.json',import.meta.url),JSON.stringify(report,null,2));
console.log(report.filter((n,i)=>report.findIndex(o=>o.node.replace(/\.[0-9]+$/,'')===n.node.replace(/\.[0-9]+$/,''))===i).map(n=>`${n.file}: ${n.node}: ${n.size.join(' × ')}`).join('\n'));
