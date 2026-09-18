import type { CrossSection, Manifold, ManifoldAPI, NumericParams, PartDefinition, SolidPart, Vec3 } from '../types.ts';
import { PEPIN as P, PEPIN_DUMBBELL, PEPIN_STAND, PEPIN_VARIANTS, STAND, STAND_HEIGHTS, pepinPlates, pepinSelection, pepinWeights } from '../floor-parts/pepin.ts';
import { floorDefinition } from '../floor-part.ts';
type Role = SolidPart['role'];
/** Material groups: [name, role, color, metalness, roughness]. The stand's loaded pair reuses the unit groups. */
const MATERIALS = {
  carried: ['Selected plates · black powder-coated steel', 'source', '#232427', .3, .55],
  resting: ['Plates left in cradle · black powder-coated steel', 'source', '#232427', .3, .55],
  heads: ['Aluminum headplates and selector strips', 'source', '#222326', .45, .45],
  micro: ['2.5 lb micro plates', 'source', '#2a2b2e', .35, .5],
  handle: ['Nickel-plated volcano-knurled handle', 'handle', '#b9bcbf', .9, .34],
  rails: ['Cerakote side rails', 'source', '#2b2c2f', .2, .55],
  marks: ['Laser-etched weight markings', 'source', '#c9ccce', .3, .5],
  cradle: ['Steel cradle and expandable bookends', 'source', '#202123', .3, .55],
  liners: ['UHMW cradle liners and tray mats', 'liner', '#141516', 0, .9],
  badge: ['REP x PÉPIN cradle nameplate', 'source', '#b4b6b8', .7, .35],
  pins: ['Magnetic pop-pins and stainless hardware', 'fastener', '#a2a6aa', .85, .28],
  frame: ['Powder-coated 11-gauge steel frame', 'frame', '#353739', 0, .55],
  trays: ['Powder-coated cradle trays', 'source', '#2e2f31', .3, .45],
  wheels: ['Locking swivel caster wheels', 'liner', '#161718', 0, .8],
} as const satisfies Record<string, readonly [string, Role, string, number, number]>;
type Group = keyof typeof MATERIALS;
type Pt = [number, number];
function kit(api: ManifoldAPI) {
  const {Manifold:M,CrossSection:C}=api, owned:(Manifold|CrossSection)[]=[], groups=new Map<Group,Manifold[]>();
  const k=<T extends Manifold|CrossSection>(s:T):T=>(owned.push(s),s);
  const box=(size:Vec3,at:Vec3)=>k(k(M.cube(size,true)).translate(at));
  /** Cross-section in the X/Z plane extruded along +Y from y0. */
  const extrudeY=(cs:CrossSection,t:number,y0:number,x=0,z=0)=>k(k(k(cs.extrude(t)).rotate([90,0,0])).translate([x,y0+t,z]));
  const prismY=(points:Pt[],t:number,y0:number,x=0,z=0)=>extrudeY(k(new C([points])),t,y0,x,z);
  /** Polygon in the Y/Z plane extruded along +X from x0. */
  const prismX=(points:Pt[],t:number,x0:number)=>k(k(k(k(k(new C([points])).extrude(t)).rotate([90,0,0])).rotate([0,0,90])).translate([x0,0,0]));
  const rounded=(w:number,h:number,r:number)=>k(k(C.square([w-2*r,h-2*r],true)).offset(r,'Round',2,24));
  const cylY=(y0:number,y1:number,x:number,z:number,d:number,n=32)=>k(k(k(M.cylinder(y1-y0,d/2,d/2,n)).rotate([-90,0,0])).translate([x,y0,z]));
  const cylX=(x0:number,x1:number,y:number,z:number,d:number,n=32)=>k(k(k(M.cylinder(x1-x0,d/2,d/2,n)).rotate([0,90,0])).translate([x0,y,z]));
  const cylZ=(z0:number,z1:number,x:number,y:number,d:number,n=32)=>k(k(M.cylinder(z1-z0,d/2,d/2,n)).translate([x,y,z0]));
  const cut=(s:Manifold,holes:Manifold[])=>k(M.difference([s,...holes]));
  const add=(group:Group,...s:Manifold[])=>{groups.set(group,[...(groups.get(group) ?? []),...s]);};
  const move=(s:Manifold[],v:Vec3)=>s.map(m=>k(m.translate(v)));
  /** Merge each group into one named SolidPart; intermediates are released even when building fails. */
  const finish=(label:string,run:()=>void)=>{
    const out:SolidPart[]=[];let success=false;
    try {
      run();
      for(const [group,solids] of groups){const [name,role,color,metalness,roughness]=MATERIALS[group];out.push({name,solid:k(M.union(solids)),role,color,metalness,roughness});}
      const hardware=out.find(p=>p.role==='fastener');if(hardware)hardware.authoredFastenerFinish=true;
      for(const part of out)if(part.solid.isEmpty() || part.solid.status()!=='NoError')throw Error(`Invalid ${label} ${part.name}`);
      success=true;return out;
    } finally {const keep=new Set(success?out.map(p=>p.solid):[]);for(const s of owned.reverse())if(!keep.has(s as Manifold))s.delete();}
  };
  return {box,extrudeY,prismY,prismX,rounded,cylY,cylX,cylZ,cut,add,move,finish};
}
type Kit = ReturnType<typeof kit>;
/** Octagonal CNC plate (X/Z): 188 mm head over a narrow foot that nests inside the cradle walls. */
const PLATE_PROFILE:Pt[]=[[-60,0],[60,0],[60,28],[94,52],[94,140],[46,188],[-46,188],[-94,140],[-94,52],[-60,28]];
/** End selector strip; its V tip clears the bookend's U notch. */
const STRIP_PROFILE:Pt[]=[[-20,65],[0,50],[20,65],[20,172],[-20,172]];
export const HANDLE_Z = P.lift + 103;
const RAIL_X = 64, RAIL_Z = 90;
/** Pop-pin station along the rail for `plates` selected (10 lb per station, handle-only at the first mark). */
export const pepinPinY = (plates: number) => -55 + plates * 10;
/** One dumbbell in its cradle, local origin at the cradle base centre, handle along +Y. The cradle and
 * unselected plates stay at `at`; with `rest` the handle and selected plates are set down beside it. */
function pepinUnit(t:Kit,variant:number,weight:number,rest:number,at:Vec3) {
  const N=pepinPlates(variant),{plates:n,micro}=pepinSelection(weight),inner=P.grip/2+P.head,top=P.lift+P.plate;
  const face=(count:number)=>inner+count*P.pitch,out=face(N);
  const fixed=new Map<Group,Manifold[]>(),moving=new Map<Group,Manifold[]>();
  const put=(map:Map<Group,Manifold[]>,group:Group,...s:Manifold[])=>{map.set(group,[...(map.get(group) ?? []),...s]);};
  const strip=(map:Map<Group,Manifold[]>,side:number,y:number)=>{
    // Alternating large screw heads and small pin bores, as on the product's end strips.
    const y0=side>0?y:-y-P.cap;
    put(map,'heads',t.cut(t.prismY(STRIP_PROFILE,P.cap,y0,0,P.lift),[95,135].map(z=>t.cylY(side>0?y0+P.cap-3:y0-1,side>0?y0+P.cap+1:y0+3,0,P.lift+z,6,16))));
    for(const z of [75,115,155])put(map,'pins',t.cylY(side>0?y+P.cap:-y-P.cap-1.5,side>0?y+P.cap+1.5:-y-P.cap,0,P.lift+z,13,20));
  };
  for(const side of [-1,1]) {
    const span=(y0:number,len:number)=>side>0?y0:-y0-len;
    // Plates stack outward from the headplate; the pin carries the inner `n`, the rest stay seated in the cradle.
    for(let i=0;i<N;i++) {
      const y=span(inner+(i+1)*P.pitch-P.steel,P.steel),notch=t.box([80,P.steel/2+.5,6],[0,side>0?y+P.steel*.75+.25:y+P.steel*.25-.25,top-2]);
      if(i<n)put(moving,'carried',t.cut(t.prismY(PLATE_PROFILE,P.steel,y,0,P.lift),[notch]));
      else put(fixed,'resting',t.cut(t.prismY(PLATE_PROFILE,P.steel,y,0,P.lift),[notch]));
    }
    // Aluminum headplate with the micro-plate slot; 5 lb settings seat both 2.5 lb micro plates.
    const slotY=span(P.grip/2+9,5)+2.5;
    put(moving,'heads',t.cut(t.prismY(PLATE_PROFILE,P.head,span(P.grip/2,P.head),0,P.lift),[t.box([84,5,44],[0,slotY,top-20])]));
    if(micro)put(moving,'micro',t.box([82,4.6,40],[0,slotY,top-22]));
    strip(fixed,side,out);
    if(rest)strip(moving,side,face(n));
    put(moving,'handle',t.cylY(side>0?P.grip/2-5:-P.grip/2,side>0?P.grip/2:-P.grip/2+5,0,HANDLE_Z,44,40));
    // Cerakote side rails with the pin window, travelling pop-pin and laser-etched 10 lb stations.
    const x=side*RAIL_X,innerX=x-side*11;
    put(moving,'rails',t.cut(t.extrudeY(t.rounded(22,30,5),P.grip+12,-P.grip/2-6,x,RAIL_Z),[t.box([8,116,12],[innerX,0,RAIL_Z])]));
    put(moving,'pins',t.cylX(Math.min(innerX,innerX-side*14),Math.max(innerX,innerX-side*14),pepinPinY(n),RAIL_Z,12,20));
    for(let j=0;j<12;j++)put(moving,'marks',t.box([j===n?11:6,1.4,.8],[x,pepinPinY(j),RAIL_Z+14.8]));
  }
  // Knurled grip: core plus fine raised rings for the volcano pattern.
  put(moving,'handle',t.cylY(-P.grip/2-2,P.grip/2+2,0,HANDLE_Z,P.handle,40));
  for(let y=-P.grip/2+6;y<P.grip/2-6;y+=3.5)put(moving,'handle',t.cylY(y,y+1.2,0,HANDLE_Z,P.handle+.9,40));
  // Cradle: fixed base and walls, bookends at the variant's pre-drilled station, UHMW liners and nameplate.
  put(fixed,'cradle',t.box([P.cradleWidth,P.cradleLength,5],[0,0,2.5]));
  put(fixed,'badge',t.box([56,110,1.5],[0,0,5.75]));
  for(const side of [-1,1]) {
    const wx=side*(P.cradleWidth/2-2.5),w=P.bookendWidth/2,y0=side>0?out:-out-P.cap,through=(pts:Pt[])=>t.prismY(pts,P.cap+2,y0-1);
    put(fixed,'cradle',t.cut(t.box([5,P.cradleLength,42],[wx,0,21]),[-150,0,150].map(y=>t.box([7,90,20],[wx,y,24]))));
    put(fixed,'cradle',t.cut(t.prismY([[-w,5],[w,5],[w,90],[w-22,5+P.bookendHeight],[-w+22,5+P.bookendHeight],[-w,90]],P.cap,y0),
      [t.box([60,P.cap+2,80],[0,y0+P.cap/2,135]),t.cylY(y0-1,y0+P.cap+1,0,95,60,40),through([[-16,26],[-4,26],[-10,40]]),through([[-4,26],[16,26],[6,52]])]));
    const len=out-P.grip/2,cy=side*(P.grip/2+len/2);
    put(fixed,'liners',t.cut(t.box([118,len,12],[0,cy,11]),[-30,0,30].map(x=>t.box([3,len+2,3],[x,cy,17]))));
  }
  const loose:Vec3=rest?[at[0]+P.plate+P.restGap,at[1],at[2]-P.lift]:at;
  for(const [map,v] of [[fixed,at],[moving,loose]] as const)for(const [group,solids] of map)t.add(group,...t.move(solids,v));
}
export function buildPepinDumbbell(api:ManifoldAPI,p:NumericParams):SolidPart[] {
  if(!(PEPIN_VARIANTS as readonly number[]).includes(p.variant) || !pepinWeights(p.variant).includes(p.weight) || ![0,1].includes(p.rest))throw Error('Unsupported dumbbell setting.');
  const t=kit(api);
  return t.finish('REP x PÉPIN',()=>pepinUnit(t,p.variant,p.weight,p.rest,[0,0,0]));
}
/** Split stand: two base beams on casters, telescoping posts, tray channels, rear tie and add-on plate holder. */
export function buildPepinStand(api:ManifoldAPI,p:NumericParams):SolidPart[] {
  if(!(STAND_HEIGHTS as readonly number[]).includes(p.height) || ![0,...PEPIN_VARIANTS].includes(p.load))throw Error('Unsupported dumbbell stand setting.');
  const t=kit(api),H=p.height*25.4,trayX=STAND.opening/2+STAND.trayWidth/2,L=STAND.length/2;
  return t.finish('dumbbell stand',()=>{
    const frame:Manifold[]=[];
    for(const side of [-1,1]) {
      const x=side*trayX,bolt=(s:number,y:number,z:number,len=8)=>t.cylX(s>0?x+81:x-81-len,s>0?x+81+len:x-81,y,z,18,20);
      frame.push(t.prismX([[-L,75],[L,75],[L,105],[L-30,135],[-L+30,135],[-L,105]],70,x-35));
      for(const y of [-L+45,L-45]) {
        t.add('wheels',t.cylX(x-12,x+12,y,32,64,32));
        t.add('pins',t.cylX(x-18,x+18,y,32,14,16),t.cylZ(64,75,x,y,52,24),t.box([36,56,4],[x,y+6,66]),...[-1,1].map(s=>t.box([4,50,40],[x+s*16,y+6,46])));
      }
      // Fixed sleeve with pull-pin, telescoping inner leg set to the chosen 1" station.
      frame.push(t.cut(t.box([76,76,200],[x,0,235]),[t.box([66,66,202],[x,0,235])]),t.box([64,64,H-235],[x,0,150+(H-235)/2]));
      t.add('pins',t.cylX(side>0?x+38:x-63,side>0?x+63:x-38,0,300,20,20),t.cylY(-58,-38,x,200,20,20));
      // Tray channel with post brackets, then the lipped tray and its rubber mat.
      frame.push(t.cut(t.box([150,440,70],[x,0,H-50]),[t.box([144,442,64],[x,0,H-50])]));
      for(const s of [-1,1]){frame.push(t.box([6,100,110],[x+s*78,0,H-85]));t.add('pins',bolt(s,-25,H-60),bolt(s,25,H-60),bolt(s,0,H-120));}
      t.add('trays',t.cut(t.box([STAND.trayWidth,STAND.trayLength,15],[x,0,H-7.5]),[t.box([STAND.trayWidth-6,STAND.trayLength-6,15],[x,0,H-4.5])]));
      t.add('liners',t.cut(t.box([STAND.trayWidth-8,STAND.trayLength-8,3],[x,0,H-10.5]),[-120,-60,60,120].map(y=>t.cylZ(H-13,H-8,x+(Math.abs(y)>100?-25:25),y,24,24))));
    }
    // Rear tie between the channels carries the slotted add-on weight holder (+6.2" above the trays).
    frame.push(t.box([2*trayX-150,50,50],[0,200,H-60]));
    frame.push(t.cut(t.box([200,120,157+85],[0,210,H-85+(157+85)/2]),[-70,-42,-14,14,42,70].map(x=>t.box([12,122,110],[x,210,H+157-54]))));
    t.add('frame',...frame);
    if(p.load)for(const side of [-1,1])pepinUnit(t,p.load,p.load,0,[side*trayX,0,H-9]);
  });
}
export const definitions:PartDefinition[]=[floorDefinition(PEPIN_DUMBBELL,buildPepinDumbbell),floorDefinition(PEPIN_STAND,buildPepinStand)];
