import type { Accessory, CrossmemberTopTarget, Mount, RackDoc, ResolvedInstance, Target, Vec3 } from './types.ts';
import { isDarkoTop } from './vendor-metadata.ts';
import { darkoDefaults } from './parts/darko.ts';
type MountDoc = Pick<RackDoc,'rack'|'uprights'|'connections'|'removed'|'structure'>;
export function darkoTopMount(doc:MountDoc,target:CrossmemberTopTarget): Mount {
 const edge=doc.connections.find(e=>e.id===target.connectionId),r=doc.rack;
 if(!edge || edge.level!=='upper' || doc.removed.includes(edge.id) || [edge.from,edge.to].some(id=>doc.removed.includes(id)))throw Error('Choose an active upper crossmember.');
 if(doc.structure[edge.id] && !doc.structure[edge.id].part.startsWith('crossmember-'))throw Error('Darko top mounts require a straight perforated crossmember.');
 if(!Number.isInteger(target.station)||target.station<0||![1,-1].includes(target.side))throw Error('Invalid crossmember hole station or side.');
 if(target.uprightId!==edge.from || target.hole!==0)throw Error('Crossmember target must identify its current start upright and use the rail station.');
 const a=doc.uprights[edge.from],b=doc.uprights[edge.to],distance=Math.hypot(b.x-a.x,b.y-a.y),span=distance-r.tube;
 const along=62.5+target.station*r.pitch;
 if(along>span-50)throw Error('Crossmember station is outside the perforated rail.');
 const angle=Math.atan2(b.y-a.y,b.x-a.x),normal:Vec3=[-Math.sin(angle)*target.side,Math.cos(angle)*target.side,0];
 const flangeHeight=r.pitch===50.8?50+2*r.pitch:150;
 const upper=Math.floor((r.height-25-r.firstHole)/r.pitch)-Math.round((flangeHeight-50)/r.pitch);
 const z=r.firstHole+upper*r.pitch-25+flangeHeight/2;
 const center:Vec3=[a.x+Math.cos(angle)*(r.tube/2+along),a.y+Math.sin(angle)*(r.tube/2+along),z];
 return {...target,face:Math.abs(normal[0])>.5?(normal[0]>0?'right':'left'):(normal[1]>0?'back':'front'),center,position:[center[0]+normal[0]*r.tube/2,center[1]+normal[1]*r.tube/2,z],localAnchor:[0,0,0],pinAxis:normal,connectorId:edge.id,label:`${edge.id} · top bearing / side hole ${target.station+1}`};
}
export function darkoTopMounts(doc:MountDoc):Mount[]{
 const mounts:Mount[]=[];
 for(const edge of doc.connections)for(let station=0;station<80;station++)for(const side of [1,-1] as const){
  try{mounts.push(darkoTopMount(doc,{kind:'crossmember-top',connectionId:edge.id,station,side,uprightId:edge.from,face:'front',hole:0}));}catch{}
 }
 return mounts;
}
export function matchingDarkoTarget(doc:MountDoc,target:CrossmemberTopTarget):CrossmemberTopTarget|undefined {
 const edge=doc.connections.find(e=>e.id===target.connectionId);if(!edge)return;
 const a=doc.uprights[edge.from],b=doc.uprights[edge.to];
 for(const other of doc.connections){
  if(other.id===edge.id || other.level!=='upper')continue;
  const c=doc.uprights[other.from],d=doc.uprights[other.to];
  if(Math.abs((b.x-a.x)*(d.y-c.y)-(b.y-a.y)*(d.x-c.x))>.001)continue;
  const t:CrossmemberTopTarget={...target,connectionId:other.id,uprightId:other.from};
  try{const m=darkoTopMount(doc,t),n=darkoTopMount(doc,target);const v=[m.center[0]-n.center[0],m.center[1]-n.center[1]];if(Math.abs(v[0]*(b.x-a.x)+v[1]*(b.y-a.y))<.01 && Math.hypot(...v)>doc.rack.tube)return t;}catch{}
 }
}
export function vendorSide(id:string,index:number) { return ['front-left','front-right','rear-left','rear-right'].includes(id) ? (id.endsWith('right')?'right':'left') : index?'right':'left'; }
export function resolveDarkoTop(doc:RackDoc,a:Accessory,targets:Target[]):ResolvedInstance[]{
 return targets.map((t,i)=>{
  if(t.kind!=='crossmember-top')throw Error('Darko Anchor requires a crossmember-top target.');
  const m=darkoTopMount(doc,t),edge=doc.connections.find(e=>e.id===t.connectionId)!,start=doc.uprights[edge.from],end=doc.uprights[edge.to];
  const angle=Math.atan2(end.y-start.y,end.x-start.x)+(t.side===-1?Math.PI:0);
  return {id:a.paired?`${a.id}:${vendorSide(t.uprightId,i)}`:a.id,part:a.part,params:{...darkoDefaults,...a.params,upright:doc.rack.tube,mountSpacing:doc.rack.pitch},position:m.center,rotation:[0,0,angle],mount:m,mounts:[m],ownerId:a.id,kind:'accessory',paired:a.paired,connectedTo:[edge.id,edge.from,edge.to],localOutward:[0,1,0],collisionBoxes:[{min:[-106,doc.rack.tube/2+1,isDarkoTop(a.part)&&a.part==='darko-double-decker'?-325:-211],max:[106,doc.rack.tube/2+16,-45]}]};
 });
}
export function darkoGuidance(doc:RackDoc):string|undefined {
 if(!doc.accessories.some(a=>a.part.startsWith('darko-')))return;
 const count=Object.keys(doc.uprights).filter(id=>!doc.removed.includes(id)).length;
 return count<6?'Darko Lifting recommends 6-post racks or racks bolted to the ground. This model has fewer than 6 active posts and does not model verified floor anchoring.':'Darko Lifting recommends 6-post racks or racks bolted to the ground. Six or more posts are modeled; this is not a structural or load-bearing certification.';
}
