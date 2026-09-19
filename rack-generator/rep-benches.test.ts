import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {PARTS, FB5000, BLACKWING, AB4100, AB5202, AB5200, AB3100, AB3002, AB3000, AB5000, LEG_ROLLER, LELC, BENCH_PADS, benchPadBox, REP_AB_5200_2, REP_BLACKWING, REP_LEG_ROLLER} from './floor-parts/rep-benches.ts';
import {definitions} from './parts/rep-benches.ts';
import {blackwingLayout} from './parts/rep-benches-adjustable.ts';
import {AB3100_BENCH, AB4100_BENCH, AB5200_BENCH, AB5202_BENCH, ladderLayout} from './parts/rep-benches-ladder.ts';
import {BACK_PIN, SEAT_PIN, ab3000LayoutFor, ab5000Layout} from './parts/rep-benches-fid.ts';
import {fb5000Layout} from './parts/rep-benches-flat.ts';
import {coerceFloorParams, resolveBy, validateFloorParams, floorOptions} from './floor-registry.ts';
import type {FloorPart} from './floor-part.ts';
import type {NumericParams, SolidPart} from './types.ts';
const api=await Module();api.setup();
const inch=(v:number)=>v*25.4;
const build=(part:FloorPart,params:NumericParams)=>definitions.find(d=>d.id===part.id)!.build(api,params);
const bounds=(parts:SolidPart[],name?:string)=>{const s=parts.filter(p=>!name||p.name.startsWith(name)||(name==='CleanGrip'&&p.name==='Pad piping seams'));const all=api.Manifold.union(s.map(p=>p.solid)),b=all.boundingBox();all.delete();return b;};
const free=(parts:SolidPart[])=>parts.forEach(p=>p.solid.delete());
/** Defaults, then the first/middle/last value of each param with the rest at defaults (dependent options re-coerced). */
function variants(part:FloorPart){
 const out=[part.defaults];
 for(const param of part.params){const opts=floorOptions(param,part.defaults);for(const v of [opts[0],opts[opts.length>>1],opts[opts.length-1]])out.push(coerceFloorParams(part,{...part.defaults,[param.key]:v}));}
 return out;
}
const BENCHES=PARTS.filter(p=>p.params.some(q=>q.key==='backrestAngle'));
test('every entry builds closed, positive-volume solids for defaults and first/middle/last of every param',()=>{
 for(const part of PARTS)for(const params of variants(part)){
  const t0=performance.now(),parts=build(part,params),ms=performance.now()-t0,label=`${part.id} ${JSON.stringify(params)}`;
  try{
   assert.ok(parts.length>=3,label);
   for(const p of parts)assert.ok(!p.solid.isEmpty()&&p.solid.status()==='NoError'&&p.solid.volume()>0,`${label} ${p.name}`);
   assert.ok(parts.reduce((n,p)=>n+p.solid.numTri(),0)<80000,`${label} triangle budget`);
   assert.ok(ms<1500,`${label} build time ${ms}`);
  }finally{free(parts);}
 }
});
test('builds sit on the floor and match the footprint exactly at defaults, and stay inside it for every other setting',()=>{
 for(const part of PARTS)for(const [i,params] of variants(part).entries()){
  const parts=build(part,params),b=bounds(parts),box=resolveBy(part.footprint,params),label=`${part.id} ${JSON.stringify(params)}`;
  const [ox,oz]=box.offset??[0,0],cx=ox,cy=-oz,tol=part.id==='rep-bench-pad'?1.5:.05;
  try{
   assert.ok(b.min[2]>=-1e-6 && b.min[2]<1,label+' on the floor');
   assert.ok(b.min[0]>=cx-box.width/2-tol && b.max[0]<=cx+box.width/2+tol && b.min[1]>=cy-box.depth/2-tol && b.max[1]<=cy+box.depth/2+tol,`${label} inside footprint`);
   // Exact at defaults, and for every setting that keeps the envelope pose (flat pads, rollers in their use hole).
   const envelope=i===0||!['backrestAngle','seatAngle','roller','spacing','zeroGap','post','extension','curl'].some(k=>params[k]!==part.defaults[k]&&k in params);
   if(envelope){
    assert.ok(Math.abs(b.max[0]-b.min[0]-box.width)<tol,`${label} width ${b.max[0]-b.min[0]} vs ${box.width}`);
    assert.ok(Math.abs(b.max[1]-b.min[1]-box.depth)<tol,`${label} depth ${b.max[1]-b.min[1]} vs ${box.depth}`);
    assert.ok(Math.abs((b.max[0]+b.min[0])/2-cx)<tol && Math.abs((b.max[1]+b.min[1])/2-cy)<tol,`${label} centre`);
   }
  }finally{free(parts);}
 }
});
test('published envelopes and pad sizes come out of the builds',()=>{
 const within=(v:number,target:number,tol:number,label:string)=>assert.ok(Math.abs(v-target)<=tol,`${label}: ${v.toFixed(1)} vs ${target.toFixed(1)}`);
 const cases:[FloorPart,number,number,number][]=[[PARTS[0],50.5,21,16.9],[REP_BLACKWING,59.5,25.8,17.2],[PARTS[2],51.3,20.3,17],[REP_AB_5200_2,57.6,25.8,17.5],[PARTS[4],50.5,23,16.75],[PARTS[5],56.6,25.8,17.1],[PARTS[6],54,26,17.5],[PARTS[7],57.6,20.6,17.75],[PARTS[8],57,20.25,17.75]];
 for(const [part,L,W,H] of cases){
  const parts=build(part,part.defaults),b=bounds(parts),pad=bounds(parts,'CleanGrip');
  try{
   within(b.max[1]-b.min[1],inch(L),1,`${part.id} length`);within(b.max[0]-b.min[0],inch(W),1,`${part.id} width`);
   within(pad.max[2],inch(H),1,`${part.id} flat pad height (IPF)`);
  }finally{free(parts);}
 }
 // FB-5000: 48 × 12 × 4″ pad (wide 13.75″) on a 3×3″ beam.
 for(const pad of [0,1]){const parts=build(PARTS[0],{pad}),b=bounds(parts,'CleanGrip'),g=fb5000Layout({pad});
  try{within(b.max[1]-b.min[1],inch(48),.5,'FB pad length');within(b.max[0]-b.min[0],pad?inch(13.75):inch(12),.5,'FB pad width');within(b.max[2]-g.padBottom,inch(4),.5,'FB pad thickness');assert.equal(g.t,FB5000.tube);}finally{free(parts);}}
 // Adjustable back/seat pad lengths at flat and the published gap.
 for(const [part,back,seat] of [[REP_BLACKWING,BLACKWING.backLength,BLACKWING.seatLength],[PARTS[2],AB4100.backLength,AB4100.seatLength],[REP_AB_5200_2,AB5202.backLength,AB5202.seatLength],[PARTS[4],AB3100.backLength,AB3100.seatLength],[PARTS[7],AB5200.backLength,AB5200.seatLength],[PARTS[8],AB5000.backLength,AB5000.seatLength]] as const){
  const parts=build(part,part.defaults),pad=bounds(parts,'CleanGrip');
  try{within(pad.max[1]-pad.min[1],back+seat+(part===REP_BLACKWING?45:part===PARTS[8]?AB5000.gap:(part===PARTS[2]?AB4100.gap:part===REP_AB_5200_2?AB5202.gap:part===PARTS[4]?AB3100.gap:AB5200.gap)),1,`${part.id} pad run`);}finally{free(parts);}
 }
 // Leg roller 2.0: 586 mm total width, 143.4 mm rollers; LE/LC 846 × 648.7 mm.
 {const parts=build(REP_LEG_ROLLER,{version:1,spacing:262}),r=bounds(parts),roll=bounds(parts,'Molded');try{within(r.max[0]-r.min[0],LEG_ROLLER.v2.width,.5,'leg roller 2.0 width');}finally{free(parts);}}
 {const parts=build(REP_LEG_ROLLER,{version:0,spacing:0}),roll=bounds(parts,'Foam');try{assert.ok(roll.min[2]<1e-6&&Math.abs(roll.max[2]-roll.min[2]-LEG_ROLLER.v1.roller)<.5,'1.0 rests level on its four 4″ rollers');}finally{free(parts);}}
 {const part=PARTS[10],parts=build(part,part.defaults),b=bounds(parts);try{within(b.max[1]-b.min[1],LELC.length,.1,'LE/LC length');within(b.max[0]-b.min[0],LELC.width,.1,'LE/LC width');}finally{free(parts);}}
 // Bench pads laid flat: REP table dimensions.
 for(const [fit,pad] of BENCH_PADS.entries()){const parts=build(PARTS[11],{fit}),b=bounds(parts);
  try{within(b.max[2],inch(pad.back[3]),.3,`${pad.name} height`);within(b.max[1]-b.min[1],benchPadBox({fit}).depth,.3,`${pad.name} run`);}finally{free(parts);}}
});
test('ladder stations come from fixed-length links: every published angle has its own slot inside the ladder',()=>{
 const check=(label:string,stations:[number,number][],bracket:(a:number)=>[number,number],len:number,angles:readonly number[],A:[number,number],B:[number,number])=>{
  for(const [i,a] of angles.entries()){const s=stations[i],br=bracket(a);assert.ok(Math.abs(Math.hypot(s[0]-br[0],s[1]-br[1])-len)<1e-6,`${label} ${a}° link length`);
   const t=((s[0]-A[0])*(B[0]-A[0])+(s[1]-A[1])*(B[1]-A[1]))/((B[0]-A[0])**2+(B[1]-A[1])**2);assert.ok(t>=0&&t<=1,`${label} ${a}° on the ladder (${t.toFixed(2)})`);}
  // Incline slots step monotonically toward the hinge; decline stations only need to land on the ladder.
  const along=(s:[number,number])=>((s[0]-A[0])*(B[0]-A[0])+(s[1]-A[1])*(B[1]-A[1]))/Math.hypot(B[0]-A[0],B[1]-A[1]);
  const ts=stations.filter((_,i)=>angles[i]>=0).map(along),inc=angles.filter(a=>a>=0),dir=Math.sign(ts[1]-ts[0]);
  for(let i=1;i<ts.length;i++)assert.ok(dir*(ts[i]-ts[i-1])>8,`${label} slots ${inc[i-1]}/${inc[i]} distinct and in order`);
 };
 const bw=blackwingLayout(REP_BLACKWING.defaults);check('BlackWing back',bw.stations,bw.bracket,bw.link,BLACKWING.back,bw.ladderA,bw.ladderB);
 for(const [label,bench,params] of [['AB-4100',AB4100_BENCH,{pad:0}],['AB-5200 2.0',AB5202_BENCH,{pad:0,post:1}],['AB-5200',AB5200_BENCH,{pad:0}],['AB-3100',AB3100_BENCH,{}]] as const){
  const g=ladderLayout(bench,params);check(`${label} back`,g.backStations,g.backBracket,g.backLink,g.angles,g.ladderA,g.ladderB);check(`${label} seat`,g.seatStations,g.seatBracket,g.seatLink,bench.seat,g.seatA,g.seatB);
 }
 for(const v2 of [true,false]){const g=ab3000LayoutFor(v2,{pad:0});check(`AB-3000 ${v2?'2.0':'1.0'} back`,g.stations,g.bracket,g.link,v2?AB3002.back:AB3000.back,g.ladderA,g.ladderB);}
 // Quadrant benches: one hole per angle, all distinct, on the arm circle.
 // AB-5000: the quadrant hole for each angle, carried by its pad, lands exactly on the frame-fixed pin.
 const q=ab5000Layout({pad:0}),[py,pz]=q.pads.pivot,pol=(r:number,a:number)=>[py+r*Math.cos(a*Math.PI/180),pz+r*Math.sin(a*Math.PI/180)] as [number,number];
 const rot=(p:[number,number],a:number)=>{const c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180),dy=p[0]-py,dz=p[1]-pz;return [py+dy*c-dz*s,pz+dy*s+dz*c];};
 for(const a of AB5000.back){const h=rot(pol(245,BACK_PIN-a),a),pin=pol(245,BACK_PIN);assert.ok(Math.hypot(h[0]-pin[0],h[1]-pin[1])<1e-6,`AB-5000 back ${a}`);}
 for(const a of AB5000.seat){const h=rot(pol(175,SEAT_PIN+a),-a),pin=pol(175,SEAT_PIN);assert.ok(Math.hypot(h[0]-pin[0],h[1]-pin[1])<1e-6,`AB-5000 seat ${a}`);}
 // AB-5200 2.0 adjustable post: decline angles lower the post top; the fixed post cannot decline.
 const g=ladderLayout(AB5202_BENCH,{pad:0,post:1});assert.ok(g.postTop(-8)<g.postTop(-4)&&g.postTop(-4)<g.postTop(0));
});
test('articulated pads really move: incline raises the back pad, seat angle lifts the seat front, attachments add reach',()=>{
 for(const part of BENCHES){
  const top=(params:NumericParams)=>{const parts=build(part,{...part.defaults,...params}),b=bounds(parts,'CleanGrip');free(parts);return b.max[2];};
  const back=floorOptions(part.params.find(p=>p.key==='backrestAngle')!,part.defaults),seat=floorOptions(part.params.find(p=>p.key==='seatAngle')!,part.defaults);
  assert.ok(top({backrestAngle:back[back.length-1]})>1200,`${part.id} upright back pad`);
  assert.ok(top({seatAngle:seat[seat.length-1]})>top({})+60,`${part.id} seat front lifts`);
 }
 for(const part of [REP_BLACKWING,PARTS[8]]){
  const depth=(attachment:number)=>resolveBy(part.footprint,{...part.defaults,attachment}).depth;
  assert.ok(depth(1)>depth(0)+250 && depth(2)>depth(1) && depth(3)>depth(0)+500,`${part.id} attachment reach`);
  const parts=build(part,{...part.defaults,attachment:3});try{assert.ok(parts.some(p=>p.name.startsWith('Molded'))&&bounds(parts).max[2]>900,'LE/LC mounted');}finally{free(parts);}
 }
});
test('params validate strictly and coerce dependent options',()=>{
 for(const part of PARTS){assert.deepEqual(validateFloorParams(part,{}),part.defaults);assert.throws(()=>validateFloorParams(part,{nope:1}),new RegExp(part.noun));}
 assert.throws(()=>validateFloorParams(REP_BLACKWING,{backrestAngle:40}),/bench/);
 assert.throws(()=>validateFloorParams(REP_BLACKWING,{attachment:4}),/bench/);
 assert.deepEqual(validateFloorParams(REP_AB_5200_2,{post:1,backrestAngle:-8}),{...REP_AB_5200_2.defaults,post:1,backrestAngle:-8});
 assert.throws(()=>validateFloorParams(REP_AB_5200_2,{post:0,backrestAngle:-8}),/bench/);
 assert.equal(coerceFloorParams(REP_AB_5200_2,{post:0,backrestAngle:-8}).backrestAngle,0,'fixed post snaps decline to flat');
 assert.deepEqual(validateFloorParams(REP_LEG_ROLLER,{version:0,spacing:0}),{version:0,spacing:0});
 assert.equal(coerceFloorParams(REP_LEG_ROLLER,{version:1,spacing:0}).spacing,262);
 assert.throws(()=>validateFloorParams(REP_LEG_ROLLER,{version:0,spacing:262}),/leg roller/);
 for(const part of PARTS)assert.ok(part.vendor?.reconstruction && part.description?.endsWith('REP trademarks belong to REP Fitness.'),part.id);
 assert.equal(REP_AB_5200_2.params.find(p=>p.key==='rail')!.format!(6),'White');
});
