import { darkoDefaults, validateDarko } from './parts/darko.ts';
import { darkoTopMount, resolveDarkoTop, vendorSide } from './darko-mounts.ts';
import type { Accessory, Mount, NumericParams, PlacementInfo, RackDoc, ResolvedInstance, Target, Vec3 } from './types.ts';
import { isVoltra, isDarko, isDarkoTop, vendorAttribution } from './vendor-metadata.ts';
import { validateVoltra, voltraDefaults } from './parts/voltra.ts';
export const isVendorPart = (part: string) => isVoltra(part) || isDarko(part);
export function vendorDefaults(part: string): NumericParams { return isVoltra(part) ? {...voltraDefaults} : {...darkoDefaults}; }
export function vendorPlacement(part: string): PlacementInfo {
 return {family:isVoltra(part)?'voltra':isDarkoTop(part)?'darko-top':'darko-dock',label:vendorAttribution(part)!.credit,paired:true,fields:[],faces:['front','back','left','right'],description:vendorAttribution(part)!.reconstruction};
}
export function validateVendorParams(part: string, params: NumericParams) {
 const defaults = vendorDefaults(part);
 for(const [key,value] of Object.entries(params)) if(!(key in defaults) || !Number.isFinite(value)) throw Error(`Unsupported ${part} parameter: ${key}.`);
 if(isVoltra(part)) validateVoltra(params); else validateDarko(params);
}
export function vendorLimits(part: string, params: NumericParams, rack: RackDoc['rack']): [number,number] {
 if(isDarkoTop(part)) return [0,0];
 if(isDarko(part)) return [Math.max(0,Math.ceil((188-rack.firstHole)/rack.pitch)),Math.floor((rack.height-27-rack.firstHole)/rack.pitch)];
 const extent = Math.max((params.orientation ?? 1)%2 === 0 ? 162 : 70,part==='voltra-fixed'?90:0);
 const below = part === 'voltra-adaptive' ? Math.max(extent,118) : part === 'voltra-fixed' ? Math.max(extent,90) : extent;
 return [Math.max(0,Math.ceil((below-rack.firstHole)/rack.pitch)),Math.floor((rack.height-extent-rack.firstHole)/rack.pitch)];
}
export function validateVendorMount(doc: Pick<RackDoc,'rack'|'uprights'|'connections'|'removed'|'structure'>, accessory: Accessory) {
 if(isDarkoTop(accessory.part)) {
  if(accessory.target.kind!=='crossmember-top')throw Error('Darko Anchor requires a crossmember-top target.');
  darkoTopMount(doc,accessory.target);
 } else if(accessory.target.kind==='crossmember-top')throw Error('This part requires an upright target.');
 const pin = accessory.params.pinDiameter ?? 15.5;
 if(pin > doc.rack.holeDiameter) throw Error(`Mounting shaft ${pin} mm exceeds rack bore ${doc.rack.holeDiameter} mm.`);
 if(doc.rack.holeDiameter<15.875 || doc.rack.holeDiameter>25.4) throw Error('Vendor mount requires 5/8-inch to 1-inch rack bores.');
 const hole = accessory.target.hole;
 if(isDarko(accessory.part) && !isDarkoTop(accessory.part) && !Number.isInteger(hole))throw Error('Dock bolts require main upright stations.');
 if(!Number.isInteger(hole) && (accessory.part === 'voltra-sliding' || accessory.part === 'voltra-fixed')) throw Error('This mount requires main hole stations; its transverse pin or full bolt pattern cannot use a bench half station.');
 if(accessory.part === 'voltra-fixed' && (hole<1 || doc.rack.firstHole+(hole+1)*doc.rack.pitch>doc.rack.height-doc.rack.holeDiameter/2)) throw Error('Fixed mount needs a real bolt station above and below its dock.');
}
export function resolveVendor(doc: RackDoc, accessory: Accessory, targets: Target[]): ResolvedInstance[] {
 if(isDarkoTop(accessory.part))return resolveDarkoTop(doc,accessory,targets);
 return targets.map((t,i) => {
  const r=doc.rack, post=doc.uprights[t.uprightId], z=r.firstHole+t.hole*r.pitch;
  const angle = {front:Math.PI,back:0,left:Math.PI/2,right:-Math.PI/2}[t.face];
  const normal: Vec3 = [-Math.sin(angle),Math.cos(angle),0];
  const center: Vec3 = [post.x,post.y,z];
  const offsets = accessory.part === 'voltra-fixed' ? [-1,1] : isDarko(accessory.part) ? [0,-2] : [0];
  const mounts: Mount[] = offsets.map(offset => ({...t,hole:t.hole+offset,center:[post.x,post.y,z+offset*r.pitch],position:[post.x+normal[0]*r.tube/2,post.y+normal[1]*r.tube/2,z+offset*r.pitch],localAnchor:[0,0,offset*r.pitch],pinAxis:accessory.part==='voltra-sliding'?[Math.cos(angle),Math.sin(angle),0]:normal}));
  const extent = isDarko(accessory.part)?190:(accessory.params.orientation ?? 1)%2===0 ? 162 : 70;
  return {id:accessory.paired?`${accessory.id}:${vendorSide(t.uprightId,i)}`:accessory.id,part:accessory.part,params:{...vendorDefaults(accessory.part),...accessory.params,upright:r.tube,mountSpacing:r.pitch},position:center,rotation:[0,0,angle],mount:mounts[0],mounts,ownerId:accessory.id,kind:'accessory',paired:accessory.paired,connectedTo:[t.uprightId],localOutward:[0,1,0],collisionBoxes:[{min:[-((accessory.params.orientation??1)%2===0?70:162),r.tube/2+45,-extent],max:[(accessory.params.orientation??1)%2===0?70:162,r.tube/2+205,extent]}]};
 });
}
