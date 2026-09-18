import { floorPart, resolveBy, validateFloorParams, type FloorBox, type FloorPart } from './floor-registry.ts';
import type { FloorItem, RackDoc, ResolvedInstance, Vec2 } from './types.ts';
type Bounds = { min: number[]; max: number[] };
const entry = (part: string) => { const found = floorPart(part); if (!found) throw Error('Unknown floor item.'); return found; };
export function validateFloorItems(input: unknown, reserved: string[] = []): FloorItem[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 100) throw Error('At most 100 floor items are allowed.');
  const ids = new Set(reserved);
  const items: FloorItem[] = input.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^floor-[a-z0-9-]{1,100}$/.test(item.id) || ids.has(item.id)) throw Error('Invalid or duplicate floor item ID.');
    ids.add(item.id);
    const part = entry(item.part);
    if (!Array.isArray(item.position) || item.position.length !== 2 || !item.position.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100000)) throw Error('Invalid floor position.');
    if (typeof item.rotation !== 'number' || !Number.isFinite(item.rotation)) throw Error('Invalid floor rotation.');
    if (item.cradle !== undefined && (!part.parks || typeof item.cradle !== 'string' || !/^[a-z0-9:#+-]{3,300}$/.test(item.cradle))) throw Error(`Invalid ${part.noun} cradle.`);
    return { id:item.id, part:item.part, position:[...item.position] as Vec2, rotation:Math.atan2(Math.sin(item.rotation),Math.cos(item.rotation)), params:validateFloorParams(part,item.params), ...(item.cradle ? {cradle:item.cradle} : {}) };
  });
  // One bar per cradle support; the cradle itself is resolved (or falls back to the floor) in resolveAssembly.
  const supports = items.flatMap(i => i.cradle?.split('+') ?? []);
  if (new Set(supports).size !== supports.length) throw Error('One barbell per cradle.');
  return items;
}
/** Three floor X/Z -> source Z-up X/-Y. Source Z rotation maps to world Y. */
export function resolveFloorItems(items: FloorItem[] = []): ResolvedInstance[] {
  return items.map(item => ({ id:item.id, ownerId:item.id, part:item.part, params:{...item.params}, position:[item.position[0],-item.position[1],0], rotation:[0,0,item.rotation], kind:'floor-item', mount:null, mounts:[], connectedTo:[], paired:false, name:entry(item.part).name }));
}
/** Local floor offset -> world floor offset for a part rotated by `rotation` (same convention as resolveFloorItems). */
export const floorOffset = (rotation: number, [x, z]: Vec2): Vec2 => { const c=Math.cos(rotation),s=Math.sin(rotation); return [x*c+z*s,-x*s+z*c]; };
function boxBounds(item: FloorItem, box: FloorBox): Bounds {
  const c=Math.abs(Math.cos(item.rotation)),s=Math.abs(Math.sin(item.rotation)),[ox,oz]=floorOffset(item.rotation,box.offset ?? [0,0]);
  const x=(box.width*c+box.depth*s)/2,z=(box.depth*c+box.width*s)/2,cx=item.position[0]+ox,cz=item.position[1]+oz;
  return { min:[cx-x,cz-z], max:[cx+x,cz+z] };
}
export const floorBounds = (item: FloorItem) => boxBounds(item, resolveBy(entry(item.part).footprint, item.params));
export function clearanceBounds(item: FloorItem) { const clearance=entry(item.part).clearance; return clearance && boxBounds(item, resolveBy(clearance, item.params)); }
const overlaps=(a:Bounds,b:Bounds,margin=0)=>a.min.every((v,i)=>v<b.max[i]+margin && a.max[i]+margin>b.min[i]);
export function rackBounds(doc: RackDoc): Bounds | null {
  const posts=Object.entries(doc.uprights).filter(([id])=>!doc.removed.includes(id)).map(([,p])=>p);
  return posts.length ? {min:[Math.min(...posts.map(p=>p.x))-doc.rack.tube/2,Math.min(...posts.map(p=>-p.y))-doc.rack.tube/2],max:[Math.max(...posts.map(p=>p.x))+doc.rack.tube/2,Math.max(...posts.map(p=>-p.y))+doc.rack.tube/2]} : null;
}
const title = (part: FloorPart) => part.noun[0].toUpperCase() + part.noun.slice(1);
export function floorWarnings(doc: RackDoc) {
  const items=(doc.floorItems ?? []).filter(i=>!i.cradle), warnings: {ids:[string,string];message:string}[]=[], rack=rackBounds(doc);
  for (const [i,item] of items.entries()) {
    const bounds=floorBounds(item),clear=clearanceBounds(item),noun=title(entry(item.part));
    if(rack && overlaps(bounds,rack)) warnings.push({ids:[item.id,'rack'],message:`${noun} overlaps the rack footprint.`});
    else if(rack && clear && overlaps(clear,rack)) warnings.push({ids:[item.id,'rack'],message:`${noun} use clearance overlaps the rack.`});
    for(const other of items.slice(i+1)) if(overlaps(bounds,floorBounds(other))) warnings.push({ids:[item.id,other.id],message:'Floor items overlap.'});
    if(clear) for(const other of items) if(other!==item && overlaps(clear,floorBounds(other)) && !overlaps(bounds,floorBounds(other))) warnings.push({ids:[item.id,other.id],message:`${noun} use clearance overlaps another floor item.`});
  }
  return warnings;
}
/** Moves a staged group rigidly: the first item goes to `position` and the rest keep their offsets in its frame. */
export function moveFloorGroup(items: FloorItem[], position?: Vec2, rotationDelta = 0) {
  const [lead]=items, local=items.map(i=>floorOffset(-lead.rotation,[i.position[0]-lead.position[0],i.position[1]-lead.position[1]]));
  const origin=position ?? lead.position, rotation=lead.rotation+rotationDelta;
  items.forEach((item,i)=>{ const [x,z]=floorOffset(rotation,local[i]); item.rotation+=rotationDelta; item.position=[origin[0]+x,origin[1]+z]; });
}
/** Adds one unit (or a pair for `pair` parts) at `position`, else at the entry's suggested side of the rack, stepping clear of other floor items. */
export function addFloorItem(doc: RackDoc, part: string, position?: Vec2, pair = false): RackDoc {
  const spec=entry(part), next=structuredClone(doc), free=(id:string)=>!(next.floorItems!.some(i=>i.id===id) || next.systems?.some(i=>i.id===id) || Object.hasOwn(next.uprights,id) || next.connections.some(i=>i.id===id) || next.accessories.some(i=>i.id===id));
  next.floorItems ??= [];
  const unit=():FloorItem=>{ let id:string; do {id=`floor-${next.nextId++}`;} while(!free(id)); return {id,part:spec.id as FloorItem['part'],position:[0,0],rotation:0,params:{...spec.defaults}}; };
  const items=[unit()];
  if(pair && spec.pair) items.push({...unit(),position:[resolveBy(spec.footprint,spec.defaults).width+spec.pair.gap,0]});
  const {side='right',gap=200}=spec.placement ?? {}, rack=rackBounds(doc) ?? {min:[0,0],max:[0,0]}, mid=(b:Bounds,i:number)=>(b.min[i]+b.max[i])/2;
  const along=side==='right' || side==='left' ? 1 : 0, sign=side==='right' || side==='front' ? 1 : -1, span=items.map(floorBounds).reduce((a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))}));
  const start:Vec2=position ?? (along ? [sign>0 ? rack.max[0]+gap-span.min[0] : rack.min[0]-gap-span.max[0], mid(rack,1)-mid(span,1)] : [mid(rack,0)-mid(span,0), sign>0 ? rack.max[1]+gap-span.min[1] : rack.min[1]-gap-span.max[1]]);
  moveFloorGroup(items,start);
  // Step along the rack side by the footprint plus 100 mm, on the 25 mm grid, until clear of existing floor items.
  const stride=Math.ceil((span.max[along]-span.min[along]+100)/25)*25;
  if(!position) while(items.some(item=>next.floorItems!.some(other=>!other.cradle && overlaps(floorBounds(item),floorBounds(other),100)))) for(const item of items) item.position[along]+=stride;
  next.floorItems.push(...items); return next;
}
