import { GENERIC_SPAN_OPTIONS } from '../standards.ts';
import type { Manifold, CrossSection, Vec2, Vec3 } from 'manifold-3d';
import type { ManifoldAPI, NumericParams, PartDefinition, SolidPart } from '../types.ts';
type Owned = Manifold | CrossSection;
const vec3 = (v: number[]): Vec3 => [v[0], v[1], v[2]];
// Dimensions measured from decoded reference components, in mm. Solids are rebuilt
// from profiles, booleans and swept circular stock; no source triangles are used.
const steel = '#24272b', zinc = '#aeb3b8', plastic = '#151719';
function geometry(api: ManifoldAPI) {
  const { Manifold: M, CrossSection: C } = api;
  const allocated: Owned[] = []; const k = <T extends Owned>(x: T): T => (allocated.push(x), x);
  const move = (s: Manifold, v: number[]) => k(s.translate(vec3(v)));
  const rotate = (s: Manifold, r: number[]) => k(s.rotate(vec3(r)));
  const union = (...s: (Manifold | Manifold[])[]) => k(M.union(s.flat()));
  const cut = (s: Manifold, ...holes: (Manifold | Manifold[])[]) => k(M.difference([s, ...holes.flat()]));
  const box = (size: number[], center = [0, 0, 0]) => move(k(M.cube(vec3(size), true)), center);
  const cyl = (a: number[], b: number[], d: number, segments = 48) => {
    const v = b.map((x, i) => x - a[i]), l = Math.hypot(...v);
    return move(rotate(k(M.cylinder(l, d / 2, d / 2, segments)), [0, Math.acos(v[2] / l) * 180 / Math.PI, Math.atan2(v[1], v[0]) * 180 / Math.PI]), a);
  };
  const ball = (center: number[], d: number) => move(k(M.sphere(d / 2, 48)), center);
  const path = (points: number[][], d: number) => union(points.slice(1).map((v, i) => cyl(points[i], v, d)), points.slice(1, -1).map(v => ball(v, d)));
  const roundedProfile = (w: number, h: number, r: number) => k(k(C.square([w - r * 2, h - r * 2], true)).offset(r, 'Round', 2, 48));
  const rounded = (size: number[], r: number, center = [0, 0, 0]) => move(k(roundedProfile(size[0], size[1], r).extrude(size[2])), [center[0], center[1], center[2] - size[2] / 2]);
  const profileXZ = (points: number[][], depth: number, y = 0) => {
    const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
    return move(rotate(k(k(new C([(area<0?[...points].reverse():points).map(p => [p[0],p[1]] as Vec2)])).extrude(depth)), [90, 0, 0]), [0, y + depth / 2, 0]);
  };
  const plateX = (x: number, y: number, z: number, width: number, height: number, thickness = 5, radius = 10, holes: number[][] = []) => {
    const b = move(rotate(k(roundedProfile(width, height, radius).extrude(thickness)), [90, 0, 90]), [x - thickness / 2, y, z]);
    return cut(b, holes.map(([hy, hz, d = 25]) => cyl([x - thickness, hy, hz], [x + thickness, hy, hz], d)));
  };
  const ring = (a: number[], b: number[], outside: number, inside: number) => cut(cyl(a, b, outside), cyl(a.map((v,i)=>v-(b[i]-a[i])*.1),b.map((v,i)=>v+(b[i]-a[i])*.1),inside));
  // M16 hardware: 30 mm OD washers, 24 mm AF hexagon, 13 mm nut, 115 mm bolt.
  const boltX = (x: number, y: number, z: number, sign: number, span = 83, diameter = 16) => {
    const pt = (t: number) => [x + sign * t, y, z];
    const nut = cut(cyl(pt(span + 3), pt(span + 16), 27.713, 6), cyl(pt(span + 2), pt(span + 25), diameter + .3));
    return union(cyl(pt(-10), pt(span + 21), diameter), cyl(pt(-10), pt(-2), 27.713, 6),
      ring(pt(-2), pt(1), 30, diameter + 1), ring(pt(span), pt(span + 3), 30, diameter + 1), nut);
  };
  const capScrew = (x: number, y: number, z: number, axis = 'z') => {
    let s = cut(union(k(M.cylinder(3.5, 5, 4.3, 32)), k(M.cylinder(2, 5, 5, 32))), move(k(M.cylinder(3, 2.3, 2.3, 6)), [0,0,2]));
    if(axis === 'y') s = rotate(s,[90,0,0]);
    if(axis === 'x') s = rotate(s,[0,90,0]);
    return move(s,[x,y,z]);
  };
  return {allocated,M,C,k,move,rotate,union,cut,box,cyl,ball,path,rounded,roundedProfile,profileXZ,plateX,ring,boltX,capScrew};
}
type Geometry = ReturnType<typeof geometry>;
function construct(api: ManifoldAPI, p: NumericParams, build: (g: Geometry) => SolidPart[]): SolidPart[] {
  for (const [key, value] of Object.entries(p)) if (!Number.isFinite(value) || value <= 0) throw Error(`${key} must be positive.`);
  if (p.length < 250 || p.length > 3000) throw Error('Length must be 250–3000 mm.');
  const g = geometry(api), {allocated} = g;
  let result: SolidPart[] = [], success = false;
  try {
    result = build(g);
    for(const {solid} of result) if(solid.status() !== 'NoError' || solid.isEmpty()) throw Error('Invalid part geometry: '+solid.status()+', empty='+solid.isEmpty());
    success = true; return result;
  } finally {
    const keep = new Set<Owned>(success ? result.map(p => p.solid) : []);
    allocated.reverse().forEach(s => {if(!keep.has(s)) s.delete();});
  }
}
function pullup(kind: string, api: ManifoldAPI, p: NumericParams) {
  if(p.diameter < 15 || p.diameter > 60) throw Error('Bar diameter must be 15–60 mm.');
  return construct(api,p,h=>{
    const {plateX,cyl,union,path,ball,profileXZ,boltX} = h;
    const half=p.length/2, scale=p.length/1075, body=[], bolts=[];
    if(kind==='straight') {
      const mountingSpan = p.mountSpacing ?? 200, topHole = 25 + mountingSpan;
      for(const s of [-1,1]){
        body.push(plateX(s*(half-4),0,(topHole+25)/2,60,mountingSpan+50,8,10,[[0,25,p.holeDiameter ?? 25],[0,topHole,p.holeDiameter ?? 25]]));
        // Curved triangular under-bar reinforcement, 5 mm thick.
        body.push(profileXZ([[s*(half-8),77],[s*(half-8),175],[s*(half-79),175],[s*(half-66),162],[s*(half-46),142],[s*(half-30),116],[s*(half-20),92]],5));
        for(const z of [25,topHole])bolts.push(boltX(s*(half-8),0,z,s,83,p.boltDiameter ?? 16));
      }
      body.push(cyl([-half+8,0,175],[half-8,0,175],p.diameter));
    } else {
      const sphere=kind==='sphere';
      const depth=p.projection, plateCenter=sphere?-46.194:0;
      const plateDepth=sphere?350:300;
      const front=sphere?-141.194:-85, back=sphere?48.806:85;
      const sy=depth/(sphere?190:170);
      const z=sphere?99.639:80;
      const outer=370*scale;
      for(const s of [-1,1]){
        const holes=sphere?[[-196.194*sy,30],[103.806*sy,30]]:[[-125*sy,30],[125*sy,30]];
        body.push(plateX(s*(half-2.5),plateCenter*sy,30,plateDepth*sy,60,5,10,holes));
        for(const [y,hz]of holes)bolts.push(boltX(s*(half-6),y,hz,s,sphere?74.32:82));
      }
      const scaled=(x: number,y: number,h=z)=>[x*scale,y*sy,h];
      const frontPoints=[[-half,front*sy,30],[-outer,front*sy,z],[outer,front*sy,z],[half,front*sy,30]];
      body.push(path(frontPoints,p.diameter));
      if(sphere){
        // Two outer rails run into a rounded, continuous V in the centre.
        const pts=[[-half,back*sy,30],[-outer,back*sy,z],scaled(-200,back),scaled(-24,-125),scaled(0,-134),scaled(24,-125),scaled(200,back),[outer,back*sy,z],[half,back*sy,30]];
        body.push(path(pts,p.diameter));
        for(const s of [-1,1]){
          body.push(cyl(scaled(s*350,front),scaled(s*350,158.806),p.diameter));
          body.push(cyl(scaled(s*200,front),scaled(s*200,108.806),p.diameter));
          body.push(ball(scaled(s*350,158.806),p.sphereDiameter));
          body.push(ball(scaled(s*200,108.806),p.sphereDiameter*.64));
        }
      }else{
        body.push(path([[-half,back*sy,30],[-outer,back*sy,z],[outer,back*sy,z],[half,back*sy,30]],p.diameter));
        for(const s of [-1,1]){
          body.push(cyl(scaled(s*310,front),scaled(s*310,back),p.diameter));
          body.push(cyl(scaled(s*140,front),scaled(s*200,back),p.diameter));
        }
      }
    }
    return [{name:'Welded bars, radiused mounting flanges and gussets',solid:union(body),color:steel,role:'frame'},{name:'Four M16 bolts, washers and hex nuts',solid:union(bolts),color:zinc,role:'fastener'}];
  });
}
// Open rack saddles have an unequal pair of upright cheeks and a lower bridge.
// End orientation is mirrored along the length, retaining the one-sided back.
function saddle(h: Geometry, x: number, sign: number, upright: number, top: number, base=0, webbing=false){
  const {plateX,rounded,rotate,move,cut,cyl,union,capScrew,box} = h;
  const span=upright+11, inner=x-sign*span/2, outer=x+sign*span/2;
  const width=webbing?70:75;
  const innerH=webbing?110:115, outerH=top-base;
  const side1=plateX(inner,0,base+innerH/2,width,innerH,5,10,[[5,base+30,6],[5,base+innerH-25,6]]);
  const side2=plateX(outer,0,base+outerH/2,width,outerH,5,10,[[0,top-25,25],[5,base+30,6],[5,base+70,6]]);
  const back = move(rotate(rounded([span+5,80,5],10),[90,0,0]),[x,sign*(upright/2+(webbing?7.5:2.5)),base+40]);
  const steelParts=[side1,side2,back];
  const pin=cyl([outer-sign*2,0,top-25],[outer-sign*(upright+8),0,top-25],16);
  steelParts.push(pin);
  const liners=[plateX(inner+sign*5,0,base+innerH/2,60,innerH,5,10),plateX(outer-sign*5,0,base+40,65,80,5,10)];
  const backLiner=move(rotate(rounded([upright-12.5,80,5],8),[90,0,0]),[x,sign*(upright/2-2.5),base+40]);
  liners.push(backLiner);
  const screws=[capScrew(inner-sign*3,5,base+30,'x'),capScrew(outer-sign*5,5,base+30,'x')];
  return {steel:steelParts,liners,screws,inner,outer};
}
function boxSafety(api: ManifoldAPI,p: NumericParams){
  if(p.wall*2>=Math.min(p.width,p.height))throw Error('Wall is too thick.');
  return construct(api,p,h=>{
    const {roundedProfile,k,rotate,move,cut,cyl,union,rounded,capScrew}=h;
    const tubeProfile=cutProfile();
    function cutProfile(){return k(roundedProfile(p.width,p.height,5).subtract(roundedProfile(p.width-p.wall*2,p.height-p.wall*2,2)));}
    let beam=move(rotate(k(tubeProfile.extrude(p.length-10)),[0,90,0]),[-p.length/2+5,0,p.height/2]);
    // Source side holes are 25 mm on 50 mm pitch across both beam walls.
    const holes=[];
    for(let x=-p.length/2+40;x<p.length/2-15;x+=50)holes.push(cyl([x,-p.width,x*0+p.height/2],[x,p.width,p.height/2],25));
    beam=cut(beam,holes);
    const bodies=[beam],liners=[],screws=[];
    for(const sign of [-1,1]){const s=saddle(h,sign*(p.length/2+40.5),sign,p.upright,162.5);bodies.push(...s.steel);liners.push(...s.liners);screws.push(...s.screws);}
    liners.push(rounded([p.length-10,p.width,5],4,[0,0,p.height+2.5]));
    for(let i=0;i<4;i++)screws.push(capScrew(-p.length/2+35+i*(p.length-70)/3,0,p.height+5));
    return [{name:'Perforated box beam and asymmetric end cradles',solid:union(bodies),color:steel,role:'frame'},{name:'Top strip and three-sided UHMW saddle liners',solid:union(liners),color:plastic,role:'liner'},{name:'Recessed liner screws',solid:union(screws),color:zinc,role:'fastener'}];
  });
}
function pinPipe(api: ManifoldAPI,p: NumericParams){
  if(p.pipeDiameter-p.wall*2<=p.pinDiameter)throw Error('Pipe bore must fit the pin.');
  return construct(api,p,h=>{
    const {cyl,cut,path}=h;
    const half=p.length/2, radius=16, end=half+99, z=100;
    const pipe=cut(cyl([-half+5,0,z],[half,0,z],p.pipeDiameter),cyl([-half+4,0,z],[half+1,0,z],p.pipeDiameter-p.wall*2));
    const pts=[[end,0,z],[-half-75,0,z]];
    for(let i=1;i<=16;i++){const a=Math.PI/2+i*Math.PI/32;pts.push([-half-75+radius*Math.cos(a),0,84+radius*Math.sin(a)]);}
    pts.push([-half-91,0,0]);
    return [{name:'Hollow 45 mm protective pipe',solid:pipe,color:steel,role:'sleeve'},{name:`${p.pinDiameter} mm pin with swept 90 degree handle`,solid:path(pts,p.pinDiameter),color:zinc,role:'rod'}];
  });
}
function webbing(api: ManifoldAPI,p: NumericParams){
  return construct(api,p,h=>{
    const {union,cyl,cut,rounded,profileXZ,box,rotate,move,ring,capScrew,path}=h;
    const bodies=[],liners=[],hardware=[],straps=[];
    const anchor=p.length/2-50;
    for(const sign of [-1,1]){
      const s=saddle(h,sign*(p.length/2+40.5),sign,p.upright,183,23,true);
      bodies.push(...s.steel);liners.push(...s.liners);hardware.push(...s.screws);
      // Two shaped 5 mm pivot lugs project inwards from each mounting cheek.
      const xx=sign*anchor;
      for(const side of [-1,1]){
        const pts=[[xx-sign*20,43],[xx-sign*20,63],[s.inner,113],[s.inner,23],[xx-sign*10,23]];
        const lug=profileXZ(pts,5,side*27.5);
        bodies.push(cut(lug,cyl([xx,-40,53],[xx,40,53],25)));
      }
      hardware.push(cyl([xx,-37.5,53],[xx,37.5,53],16));
      hardware.push(cyl([xx,-37.5,53],[xx,-30.5,53],24,6),cyl([xx,30.5,53],[xx,37.5,53],24,6));
      // Webbing loops wrap around the transverse pin; a doubled return runs 70 mm.
      straps.push(ring([xx,-p.strapWidth/2,53],[xx,p.strapWidth/2,53],20,p.pinDiameter||16));
      const tip=xx-sign*70;
      straps.push(box([70,p.strapWidth,p.strapThickness],[xx-sign*35,0,44]));
      for(const y of [-p.strapWidth/2+3,p.strapWidth/2-3]){
        for(let i=0;i<7;i++)straps.push(box([1.5,1,1],[tip+sign*i*8,y,45.5]));
      }
    }
    const n=48;
    for(let i=0;i<n;i++){
      const x0=-anchor+2*anchor*i/n,x1=-anchor+2*anchor*(i+1)/n;
      const z0=1.5+(53-1.5)*(x0/anchor)**2,z1=1.5+(53-1.5)*(x1/anchor)**2;
      const zscale=p.sag/50;
      const a=[x0,0,53-(53-z0)*zscale],b=[x1,0,53-(53-z1)*zscale];
      const len=Math.hypot(b[0]-a[0],b[2]-a[2]);
      straps.push(move(rotate(box([len+.2,p.strapWidth,p.strapThickness]),[0,-Math.atan2(b[2]-a[2],b[0]-a[0])*180/Math.PI,0]),[(a[0]+b[0])/2,0,(a[2]+b[2])/2]));
    }
    return [{name:'Shaped strap cradles and pivot lugs',solid:union(bodies),color:steel,role:'frame'},{name:'UHMW upright liners',solid:union(liners),color:plastic,role:'liner'},{name:'Pivot bolts and recessed screws',solid:union(hardware),color:zinc,role:'fastener'},{name:'40 mm doubled webbing with looped ends',solid:union(straps),color:'#292b2c',role:'source'}];
  });
}
export const definitions: PartDefinition[]=[
  {id:'pullup-straight',standardOptions:{length:GENERIC_SPAN_OPTIONS},name:'Standard pull-up bar',category:'Bars & safeties',reference:{file:'front',node:'Standard pull up bar 2100.013'},defaults:{length:1075,diameter:32},build:(a,p)=>pullup('straight',a,p)},
  {id:'pullup-multigrip',name:'Multi-grip pull-up bar',category:'Bars & safeties',reference:{file:'front',node:'Multi grip pull up bar 2100.013'},defaults:{length:1075,diameter:32,projection:170},build:(a,p)=>pullup('multi',a,p)},
  {id:'pullup-sphere',name:'Spherical multi-grip pull-up bar',category:'Bars & safeties',reference:{file:'front',node:'Spherical multi-grip pull up bar 2100.013'},defaults:{length:1075,diameter:32,projection:190,sphereDiameter:125},build:(a,p)=>pullup('sphere',a,p)},
  {id:'safety-box',standardOptions:{length:GENERIC_SPAN_OPTIONS},name:'Box safety',category:'Bars & safeties',reference:{file:'front',node:'Riot 1075 box safeties left base.002'},defaults:{length:1075,width:75,height:75,wall:3,upright:75},build:boxSafety},
  {id:'safety-pin-pipe',standardOptions:{length:GENERIC_SPAN_OPTIONS},name:'Pin-and-pipe safety',category:'Bars & safeties',reference:{file:'front',node:'Riot 1075 pin and pipe safety left base.002'},defaults:{length:1075,pipeDiameter:45,wall:3,pinDiameter:16,upright:75},build:pinPipe},
  {id:'safety-webbing',standardOptions:{length:GENERIC_SPAN_OPTIONS},name:'Webbing strap safety',category:'Bars & safeties',reference:{file:'front',node:'Riot 1075 webbing safety left base.002'},defaults:{length:1075,strapWidth:40,strapThickness:3,sag:50,upright:75},build:webbing},
];
