import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { BACKREST_ANGLES, SEAT_ANGLES, NIGHTHAWK } from '../floor-parts/nighthawk.ts';
import { floorDefinition } from '../floor-part.ts';
export const NIGHTHAWK_PIVOT: Vec3 = [0, -272, 366];
/** Identical pivot/rotation to the pad and its steel rail, including local Z offset. */
export function articulateBenchPoint(point: Vec3, degrees: number): Vec3 {
  const a = degrees * Math.PI / 180, y = point[1] - NIGHTHAWK_PIVOT[1], z = point[2] - NIGHTHAWK_PIVOT[2];
  return [point[0], NIGHTHAWK_PIVOT[1] + y * Math.cos(a) - z * Math.sin(a), NIGHTHAWK_PIVOT[2] + y * Math.sin(a) + z * Math.cos(a)];
}
/** Reconstructed fixed-length links. Ladder stations are solved from the linkage,
 * not evenly spaced guesses; both pins seat on the bottom of their closed slots. */
export function nighthawkContacts(backrestAngle: number, seatAngle: number) {
  const backTop = articulateBenchPoint([0, 28, 341], backrestAngle);
  const seatTop = articulateBenchPoint([0, -440, 340], -seatAngle);
  const backLength = 450, seatLength = 115, backPinZ = 228;
  const backBottom: Vec3 = [0, backTop[1] + Math.sqrt(backLength ** 2 - (backTop[2] - backPinZ) ** 2), backPinZ];
  const seatBottom: Vec3 = [0, -440, seatTop[2] - Math.sqrt(seatLength ** 2 - (seatTop[1] + 440) ** 2)];
  return { backTop, backBottom, seatTop, seatBottom, backLength, seatLength };
}
/** Published envelope; secondary steel sections reconstructed from REP drawings/photos.
 * Source axes: X across bench, +Y toward head, Z up. Origin at footprint centre.
 */
export function buildNighthawk(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (!(BACKREST_ANGLES as readonly number[]).includes(p.backrestAngle) || !(SEAT_ANGLES as readonly number[]).includes(p.seatAngle)) throw Error('Unsupported bench angle.');
  const contacts = nighthawkContacts(p.backrestAngle, p.seatAngle);
  const {Manifold:M,CrossSection:C}=api, owned:(Manifold|CrossSection)[]=[], out:SolidPart[]=[];
  const k=<T extends Manifold|CrossSection>(s:T):T=>(owned.push(s),s);
  const move=(s:Manifold,v:Vec3)=>k(s.translate(v));
  const rot=(s:Manifold,v:Vec3)=>k(s.rotate(v));
  const box=(size:Vec3,at:Vec3)=>move(k(M.cube(size,true)),at);
  const union=(s:Manifold[])=>k(M.union(s));
  const cut=(s:Manifold,holes:Manifold[])=>k(M.difference([s,...holes]));
  const cylinder=(a:Vec3,b:Vec3,d:number,n=32)=>{
    const v=b.map((x,i)=>x-a[i]),len=Math.hypot(...v);
    return move(rot(k(M.cylinder(len,d/2,d/2,n)),[0,Math.acos(v[2]/len)*180/Math.PI,Math.atan2(v[1],v[0])*180/Math.PI]),a);
  };
  const beam=(a:Vec3,b:Vec3,w:number,d:number)=>{
    const v=b.map((x,i)=>x-a[i]),len=Math.hypot(...v);
    const shell=cut(box([w,d,len],[0,0,len/2]),[box([w-5,d-5,len+2],[0,0,len/2])]);
    return move(rot(shell,[0,Math.acos(v[2]/len)*180/Math.PI,Math.atan2(v[1],v[0])*180/Math.PI]),a);
  };
  const rounded=(w:number,l:number,h:number,r:number,at:Vec3)=>move(k(k(k(C.square([w-2*r,l-2*r],true)).offset(r,'Round',2,24)).extrude(h)),at);
  const add=(name:string,solid:Manifold,role:SolidPart['role'],color:string,metalness=0,roughness=.55)=>out.push({name,solid,role,color,metalness,roughness});
  const frame:Manifold[]=[],rubber:Manifold[]=[],hardware:Manifold[]=[],ladders:Manifold[]=[];
  const screw=(x:number,y:number,z:number)=>cut(cylinder([x,y,z],[x+5,y,z],20),[cylinder([x+2,y,z],[x+7,y,z],8,6)]);
  let success=false;
  try {
    // Tripod rear cross-foot, full-contact front liner and raked front leg.
    frame.push(beam([-307,540,42],[307,540,42],70,65),beam([0,-500,35],[0,-330,343],70,70),beam([0,540,70],[0,540,350],60,60),beam([0,-345,295],[0,545,115],60,60));
    frame.push(rounded(240,150,7,18,[0,-510,10]));
    rubber.push(rounded(252,164,10,20,[0,-510,0]));
    for(const x of [-294,294]) rubber.push(rounded(70,105,16,12,[x,540,0]));
    // Closed back ladder side gauges: continuous retaining rail plus seven notches.
    for(const x of [-49,49]) {
      let plate=box([7,760,78],[x,105,207]);
      const slots:Manifold[]=[];
      for(const angle of BACKREST_ANGLES) slots.push(box([11,44,24],[x,nighthawkContacts(angle,0).backBottom[1],229]));
      plate=cut(plate,slots); ladders.push(plate,beam([x,-275,264],[x,485,264],12,12));
      for(const y of [-270,480]) ladders.push(beam([x,y,240],[x,y,264],12,12));
      for(const y of [-250,95,465])hardware.push(screw(x-5,y,198));
    }
    const pivot=NIGHTHAWK_PIVOT;
    const articulate=(s:Manifold,angle:number)=>move(rot(move(s,[0,-pivot[1],-pivot[2]]),[angle,0,0]),pivot);
    // Rounded rectangular back pad, tapered molded seat, separate underside backing.
    add('Back pad · CleanGrip vinyl',articulate(rounded(300,914,58,30,[0,185,366]),p.backrestAngle),'liner','#151719',0,.92);
    const seatOutline=[[-112,-642],[112,-642],[150,-475],[150,-312],[-150,-312],[-150,-475]] as [number,number][];
    const seatProfile=k(k(new C([seatOutline])).offset(-15,'Round',2,24));
    const seatRounded=k(seatProfile.offset(15,'Round',2,24));
    add('Seat pad · CleanGrip vinyl',articulate(move(k(seatRounded.extrude(58)),[0,0,366]),-p.seatAngle),'liner','#151719',0,.92);
    add('Back pad steel rail',articulate(beam([0,-273,346],[0,610,346],50,30),p.backrestAngle),'frame','#353739');
    add('Seat pad steel rail',articulate(beam([0,-320,346],[0,-612,346],50,30),-p.seatAngle),'frame','#353739');
    add('Back support link',beam(contacts.backBottom,contacts.backTop,40,35),'frame','#353739');
    const station=contacts.backBottom[1];
    add('Back ladder pin',cylinder([-95,station,228],[95,station,228],22),'source','#292b2e',.15,.5);
    // Closed seat ladder gauges on the angled front post, with four retained slots.
    for(const x of [-48,48]) {
      const plate=box([6,78,195],[x,-440,205]);
      const holes=SEAT_ANGLES.map(angle=>box([10,38,22],[x,-440,nighthawkContacts(0,angle).seatBottom[2]+1]));
      ladders.push(cut(plate,holes));
      hardware.push(screw(x-4,-435,290),screw(x-4,-435,120));
    }
    const seatZ=contacts.seatBottom[2];
    add('Seat ladder pin',cylinder([-100,-440,seatZ],[100,-440,seatZ],20),'source','#292b2e',.15,.5);
    add('Seat support link',beam(contacts.seatBottom,contacts.seatTop,32,32),'frame','#353739');
    // Rear transport wheels, fork covers, axle hardware.
    for(const x of [-245,245]) {
      rubber.push(cut(cylinder([x-18,589,47],[x+18,589,47],90,48),[cylinder([x-20,589,47],[x+20,589,47],16)]));
      for(const side of [-1,1]) frame.push(box([5,80,64],[x+side*23,571,70]));
      frame.push(box([51,80,5],[x,571,102]));
      hardware.push(cylinder([x-29,589,47],[x+29,589,47],14),screw(x+26,589,47));
    }
    // Front knurled carrying handle, risers and fine raised grip rings.
    frame.push(beam([-85,-550,18],[-85,-595,73],15,15),beam([85,-550,18],[85,-595,73],15,15));
    const grip=[cylinder([-110,-595,73],[110,-595,73],25)];
    for(let x=-105;x<=105;x+=5)grip.push(cylinder([x,-595,73],[x+1,-595,73],26));
    add('Knurled carry handle',union(grip),'handle','#303236',.7,.38);
    // Storage stand projects to the end plane without extending the envelope.
    frame.push(beam([0,555,315],[0,632,315],35,35),box([145,7,45],[0,635,315]));
    rubber.push(rounded(150,20,48,7,[0,637,291]));
    for(const y of [-283,540])hardware.push(cylinder([-57,y,345],[57,y,345],16),screw(-62,y,345),screw(57,y,345));
    for(const x of [-80,80])for(const y of [-540,540])hardware.push(cylinder([x,y,45],[x,y,51],18));
    add('Tripod powder-coated frame',union(frame),'frame','#353739');
    add('Closed ladder gauges',union(ladders),'source','#292b2e',.15,.5);
    add('Foot liners, wheels and storage bumper',union(rubber),'liner','#171819',0,.88);
    add('Black nickel fasteners',union(hardware),'fastener','#343638',.85,.25);
    out[out.length-1].authoredFastenerFinish=true;
    for(const part of out)if(part.solid.isEmpty() || part.solid.status()!=='NoError')throw Error(`Invalid Nighthawk ${part.name}`);
    success=true;return out;
  }finally{const keep=new Set(success?out.map(p=>p.solid):[]);for(const s of owned.reverse())if(!keep.has(s as Manifold))s.delete();}
}
export const definitions:PartDefinition[]=[floorDefinition(NIGHTHAWK,buildNighthawk)];
