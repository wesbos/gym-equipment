import type { FloorItem, RackDoc, ResolvedInstance, Vec2 } from './types.ts';
export const BACKREST_ANGLES = [0, 15, 30, 45, 60, 75, 85] as const;
export const SEAT_ANGLES = [-15, 0, 10, 20] as const;
export const NIGHTHAWK_DEFAULTS = { backrestAngle: 0, seatAngle: 0 };
export const NIGHTHAWK_COLORS = [['Metallic Black','#353739'],['Red','#a9232c'],['Blue','#24528a'],['Matte Black','#242526'],['Army Green','#454f36'],['White','#eeeeea']] as const;
export function validateFloorItems(input: unknown, reserved: string[] = []): FloorItem[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 100) throw Error('At most 100 floor items are allowed.');
  const ids = new Set(reserved);
  return input.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^floor-[a-z0-9-]{1,100}$/.test(item.id) || ids.has(item.id)) throw Error('Invalid or duplicate floor item ID.');
    ids.add(item.id);
    if (item.part !== 'rep-nighthawk') throw Error('Unknown floor item.');
    if (!Array.isArray(item.position) || item.position.length !== 2 || !item.position.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100000)) throw Error('Invalid floor position.');
    if (typeof item.rotation !== 'number' || !Number.isFinite(item.rotation)) throw Error('Invalid floor rotation.');
    if (!item.params || typeof item.params !== 'object' || Array.isArray(item.params) || Object.keys(item.params).some(k => !Object.hasOwn(NIGHTHAWK_DEFAULTS,k))) throw Error('Invalid bench parameters.');
    const params = { ...NIGHTHAWK_DEFAULTS, ...item.params };
    if (!(BACKREST_ANGLES as readonly number[]).includes(params.backrestAngle) || !(SEAT_ANGLES as readonly number[]).includes(params.seatAngle)) throw Error('Unsupported bench angle.');
    return { id:item.id, part:item.part, position:[...item.position] as Vec2, rotation:Math.atan2(Math.sin(item.rotation),Math.cos(item.rotation)), params };
  });
}
/** Three floor X/Z -> source Z-up X/-Y. Source Z rotation maps to world Y. */
export function resolveFloorItems(items: FloorItem[] = []): ResolvedInstance[] {
  return items.map(item => ({ id:item.id, ownerId:item.id, part:item.part, params:{...item.params}, position:[item.position[0],-item.position[1],0], rotation:[0,0,item.rotation], kind:'floor-item', mount:null, mounts:[], connectedTo:[], paired:false, name:'REP Nighthawk' }));
}
export function floorBounds(item: FloorItem) {
  const c=Math.abs(Math.cos(item.rotation)),s=Math.abs(Math.sin(item.rotation));
  const x=(658*c+1295*s)/2,z=(1295*c+658*s)/2;
  return { min:[item.position[0]-x,item.position[1]-z], max:[item.position[0]+x,item.position[1]+z] };
}
export function floorWarnings(doc: RackDoc) {
  const items=doc.floorItems ?? [], warnings: {ids:[string,string];message:string}[]=[];
  const posts=Object.entries(doc.uprights).filter(([id])=>!doc.removed.includes(id)).map(([,p])=>p);
  const rack=posts.length ? {min:[Math.min(...posts.map(p=>p.x))-doc.rack.tube/2,Math.min(...posts.map(p=>-p.y))-doc.rack.tube/2],max:[Math.max(...posts.map(p=>p.x))+doc.rack.tube/2,Math.max(...posts.map(p=>-p.y))+doc.rack.tube/2]} : null;
  const overlaps=(a:ReturnType<typeof floorBounds>,b:ReturnType<typeof floorBounds>)=>a.min.every((v,i)=>v<b.max[i] && a.max[i]>b.min[i]);
  for (const [i,item] of items.entries()) {
    const bounds=floorBounds(item);
    if(rack && overlaps(bounds,rack)) warnings.push({ids:[item.id,'rack'],message:'Bench overlaps the rack footprint.'});
    for(const other of items.slice(i+1)) if(overlaps(bounds,floorBounds(other))) warnings.push({ids:[item.id,other.id],message:'Floor items overlap.'});
  }
  return warnings;
}
export function addFloorItem(doc: RackDoc, position?: Vec2): RackDoc {
  const next=structuredClone(doc); next.floorItems ??= [];
  let id:string; do {id=`floor-${next.nextId++}`;} while(next.floorItems.some(i=>i.id===id) || Object.hasOwn(next.uprights,id) || next.connections.some(i=>i.id===id) || next.accessories.some(i=>i.id===id));
  const x=Math.max(0,...Object.values(doc.uprights).map(p=>p.x))+doc.rack.tube/2+550;
  const item:FloorItem={id,part:'rep-nighthawk',position:position ?? [x,0],rotation:0,params:{...NIGHTHAWK_DEFAULTS}};
  if(!position) { while(next.floorItems.some(other=> {const a=floorBounds(item),b=floorBounds(other);return a.min.every((v,i)=>v<b.max[i]+100 && a.max[i]+100>b.min[i]);})) item.position[1]+=1400; }
  next.floorItems.push(item); return next;
}
