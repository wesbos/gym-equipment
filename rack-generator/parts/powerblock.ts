import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { POWERBLOCK, POWERBLOCK_CRADLE_MARGIN, POWERBLOCK_LIFT, powerBlockModel, powerBlockSelection } from '../floor-parts/powerblock.ts';
import { floorDefinition } from '../floor-part.ts';
/** Vertical layout shared by the builder and tests. Build axes: X along the dumbbell, Y across (pin at -Y), Z up;
 * rotated a quarter turn at the end so the long axis runs along floor depth. */
export function powerBlockLayout(p: NumericParams) {
  const m = powerBlockModel(p), n = m.rails.length, base = 6, rod = m.width > 160 ? 10 : 8, pin = 5.5, clear = pin + 3;
  const step = (m.height - 50) / (n - 1), plateEnd = (m.length - m.cage) / 2 / n;
  /** Rod bottom of plate i (0 = innermost, highest). */
  const rodZ = (i: number) => base + clear + (n - 1 - i) * step;
  return { m, n, base, rod, pin, step, plateEnd, rodZ, top: base + m.height, ...powerBlockSelection(m, p.weight) };
}
/** Nested plate "waves" in a cradle tray; handle cage, engaged plates, adders and selector pin lifted POWERBLOCK_LIFT above it. */
export function buildPowerBlock(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  const { m, n, base, rod, pin, plateEnd, rodZ, top, plates, adders } = powerBlockLayout(p);
  const {Manifold:M,CrossSection:C}=api, owned:(Manifold|CrossSection)[]=[], out:SolidPart[]=[];
  const k=<T extends Manifold|CrossSection>(s:T):T=>(owned.push(s),s);
  const move=(s:Manifold,v:Vec3)=>k(s.translate(v));
  const box=(min:Vec3,max:Vec3)=>move(k(M.cube(max.map((v,i)=>v-min[i]) as Vec3)),min);
  const union=(s:Manifold[])=>k(M.union(s));
  const cut=(s:Manifold,holes:Manifold[])=>k(M.difference([s,...holes]));
  /** Cylinder along X ('x') or Y ('y') from a to b at the other two coordinates. */
  const bar=(axis:'x'|'y',a:number,b:number,d:number,u:number,z:number,seg=24)=>{
    const c=k(M.cylinder(b-a,d/2,d/2,seg));
    return axis==='x' ? move(k(c.rotate([0,90,0])),[a,u,z]) : move(k(c.rotate([-90,0,0])),[u,a,z]);
  };
  /** Rounded rectangle in the YZ plane, extruded along X from x0; `bevel` chamfers the face edges. */
  const plate=(x0:number,thick:number,w:number,z0:number,z1:number,r:number)=>{
    const rr=Math.min(r,w/2-.5,(z1-z0)/2-.5),s=k(k(k(C.square([z1-z0-2*rr,w-2*rr],true)).offset(rr,'Round',2,24)).extrude(thick));
    return move(k(s.rotate([0,90,0])),[x0,0,(z0+z1)/2]);
  };
  const slab=(x0:number,thick:number,w:number,z0:number,z1:number,r:number,bevel=Math.min(1.6,thick/4))=>
    k(M.hull([plate(x0+bevel,thick-2*bevel,w,z0,z1,r),plate(x0,thick,w-2*bevel,z0+bevel,z1-bevel,r-bevel)]));
  const rounded=(w:number,l:number,h:number,r:number,at:Vec3)=>move(k(k(k(C.square([w-2*r,l-2*r],true)).offset(r,'Round',2,24)).extrude(h)),at);
  const W=m.width,half=m.length/2,cage=m.cage/2,wall=16,y0=W/2-7.5,lift=POWERBLOCK_LIFT,up=(s:Manifold)=>move(s,[0,0,lift]);
  const groups=new Map<string,{solids:Manifold[];role:SolidPart['role'];color:string;metalness:number;roughness:number}>();
  const add=(name:string,solid:Manifold,role:SolidPart['role'],color:string,metalness=0,roughness=.55)=>{const g=groups.get(name) ?? {solids:[],role,color,metalness,roughness};g.solids.push(solid);groups.set(name,g);};
  const dome=m.arched ? k(k(M.cylinder(m.length+2,W*1.1,W*1.1,96,true)).rotate([0,90,0])) : undefined;
  let success=false;
  try {
    // Cradle tray: the floor footprint; left-behind plates rest on its floor.
    const tl=m.length+2*POWERBLOCK_CRADLE_MARGIN,tw=W+2*POWERBLOCK_CRADLE_MARGIN,tray=cut(rounded(tl,tw,base+22,14,[0,0,0]),[rounded(tl-10,tw-10,40,9,[0,0,base])]);
    add('Floor cradle tray',tray,'liner','#19191a',0,.9);
    // Nested plates: plate i = end slabs at both ends + front/back selector rods, stepped down and out from the core ("waves").
    for(let i=0;i<n;i++){
      const engaged=i<plates,lifted=(s:Manifold)=>engaged?up(s):s,plateName=engaged?'Engaged plates · lifted with handle':'Plates left in cradle';
      const x0=cage+i*plateEnd,z0=i===n-1?base:rodZ(i),rz=rodZ(i)+rod/2;
      const laminations=!m.bands && plateEnd>10 ? 2 : 1,lt=(plateEnd-.8*laminations)/laminations;
      for(const sx of [-1,1]){
        for(let j=0;j<laminations;j++){
          const xa=x0+.4+j*(lt+.8);let s=slab(sx>0?xa:-xa-lt,lt,W,z0,top,m.arched?10:11);
          if(dome) s=k(M.intersection([s,move(dome,[0,0,top-W*1.1])]));
          add(plateName,lifted(s),'source',m.finish,.25,m.roughness);
        }
        // Rod-to-slab knuckle at each step corner.
        for(const sy of [-1,1])add(plateName,lifted(bar('y',sy>0?y0-5:-y0-5,sy>0?y0+5:-y0+5,rod+5,sx*x0,rz,20)),'source',m.finish,.25,m.roughness);
        if(m.faceBadge && i===n-1){const face=m.arched ? rounded(m.height*.2,W*.62,1.2,m.height*.1-.5,[0,0,0]) : rounded(m.height*.62,W-28,1.2,6,[0,0,0]);
          add('End-face badges',lifted(move(k(face.rotate([0,90,0])),[sx>0?half:-half-1.2,0,base+m.height*(m.arched?.5:.45)])),'source',m.faceBadge,.1,.6);}
      }
      for(const sy of [-1,1]){
        const x1=x0+plateEnd/2;
        if(m.bands){
          add('Black selector rods',lifted(bar('x',-x1,x1,rod,sy*y0,rz)),'source','#18191b',.3,.5);
          for(const sx of [-1,1])add(`Selector rail · ${m.rails[i]}`,lifted(bar('x',sx>0?cage-wall-14:-(cage-wall-6),sx>0?cage-wall-6:-(cage-wall-14),rod+1.4,sy*y0,rz)),'source',m.rails[i],.1,.45);
        } else add(`Selector rail · ${m.rails[i]}`,lifted(bar('x',-x1,x1,rod,sy*y0,rz)),'source',m.rails[i],.1,.45);
      }
    }
    // Handle cage: two end walls with open-bottom rod channels, molded heads, top tubes, grip and core pan.
    const cageBottom=base+1,channelTop=rodZ(0)+rod+pin+3,head=top-24,tube=Math.round(W*.2),cageParts:Manifold[]=[];
    for(const sx of [-1,1]){
      const xi=sx>0?cage-wall:-cage,wallBox=box([xi,-W/2,cageBottom],[xi+wall,W/2,top-2]);
      const channels=[-1,1].map(sy=>box([xi-1,sy>0?W/2-13:-(W/2-2),cageBottom-1],[xi+wall+1,sy>0?W/2-2:-(W/2-13),channelTop]));
      cageParts.push(cut(wallBox,channels));
      const headX=sx>0?cage-wall-18:-cage;cageParts.push(rounded(18+wall,W,26,6,[headX+(18+wall)/2,0,head]));
      // Ladder ribs on the inner face of each post, one between every pair of selector rods.
      for(let i=0;i<n;i++)if(rodZ(i)-3.2>cageBottom)for(const sy of [-1,1])cageParts.push(box([sx>0?cage-wall-4:-(cage-wall),sy>0?W/2-24:-(W/2-13),rodZ(i)-3.2],[sx>0?cage-wall:-(cage-wall-4),sy>0?W/2-13:-(W/2-24),rodZ(i)-1.2]));
    }
    for(const sy of [-1,1])cageParts.push(bar('x',-(cage-wall-4),cage-wall-4,tube,sy*(W/2-tube/2-3),top-tube/2-2,32));
    cageParts.push(box([-(cage-wall),-(W/2-16),cageBottom],[cage-wall,W/2-16,cageBottom+4]));
    add('Handle cage',up(union(cageParts)),'source',m.cageColor,.2,.5);
    // Series badges on the cage heads: a coloured label on one head, the weight chart chips on the other.
    const labelX=cage-(18+wall)/2,labelW=wall+12;
    add('Series badge',up(box([-labelX-labelW/2,-(W/2-12),top+2],[-labelX+labelW/2,W/2-12,top+3.2])),'source',m.badge,.1,.5);
    add('Weight chart label',up(box([labelX-labelW/2,-(W/2-12),top+2],[labelX+labelW/2,W/2-12,top+2.6])),'source','#e6e5e0',0,.6);
    m.rails.forEach((color,i)=>add(`Selector rail · ${color}`,up(box([labelX-6,-(W/2-16)+i*(W-32)/n,top+2.6],[labelX+6,-(W/2-16)+(i+.8)*(W-32)/n,top+3.2])),'source',color,.1,.45));
    add('Expansion latch',up(bar('y',-(W/2-4),-(W/2-18),9,-labelX,top+6)),'source','#c8242d',.1,.4);
    // Grip: knurled stainless or contoured TPR, with collars at the walls.
    const gz=base+m.height*.5,gripSolids=[bar('x',-(cage-wall),cage-wall,m.gripDiameter,0,gz,40)];
    if(!m.knurled)gripSolids.push(bar('x',-m.grip*.3,m.grip*.3,m.gripDiameter+5,0,gz,40));
    add(m.knurled?'Knurled stainless grip':'Contoured TPR grip',up(union(gripSolids)),'handle',m.knurled?'#a9adb1':'#1a1b1c',m.knurled?.85:0,m.knurled?.42:.85);
    add('Handle cage',up(union([-1,1].map(sx=>bar('x',sx>0?cage-wall-6:-(cage-wall),sx>0?cage-wall:-(cage-wall-6),m.gripDiameter+10,0,gz,40)))),'source',m.cageColor,.2,.5);
    // Micro adder weights: chrome cylinders in the core under the grip.
    const ad=Math.round(m.height*.17);
    for(let a=0;a<adders;a++)add('Micro adder weights',up(bar('x',-(cage-wall-3),cage-wall-3,ad,(a?1:-1)*(ad/2+2),cageBottom+4+ad/2,32)),'handle','#dfe2e5',1,.16);
    // Magnetic selector pin: two prongs through the wall posts just under the lowest engaged rod, fork handle at the front.
    const pz=plates ? rodZ(plates-1)-pin/2-.8 : rodZ(0)+rod+pin/2+.8,px=cage-wall/2,pinParts=[-1,1].map(sx=>bar('y',-(W/2+10),W/2-1,pin,sx*px,pz,16));
    const fork=Math.round(m.height*.17);
    pinParts.push(cut(box([-px-8,-(W/2+14),pz-fork],[px+8,-(W/2+7),pz+5]),[box([-px+6,-(W/2+15),pz-fork+6],[px-6,-(W/2+6),pz-1])]));
    add('Magnetic selector pin',up(union(pinParts)),'source','#202124',.2,.45);
    for(const [name,g] of groups){const solid=g.solids.length===1?g.solids[0]:union(g.solids);out.push({name,solid:k(solid.rotate([0,0,90])),role:g.role,color:g.color,metalness:g.metalness,roughness:g.roughness});}
    for(const part of out)if(part.solid.isEmpty() || part.solid.status()!=='NoError')throw Error(`Invalid PowerBlock ${part.name}`);
    success=true;return out;
  }finally{const keep=new Set(success?out.map(p=>p.solid):[]);for(const s of owned.reverse())if(!keep.has(s as Manifold))s.delete();}
}
export const definitions:PartDefinition[]=[floorDefinition(POWERBLOCK,buildPowerBlock)];
