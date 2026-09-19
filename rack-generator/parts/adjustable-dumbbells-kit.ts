/** Shared Manifold kit for the adjustable-dumbbell family builders (parts/adjustable-dumbbells-*.ts).
 * Build axes: X along the dumbbell, Y across it (front/selector side at -Y), Z up, origin on the floor at the centre.
 * `finish` merges each material group into one SolidPart, turns the part a quarter turn so the long axis runs along
 * floor depth (pairs then sit side by side, as racked) and recentres the footprint on the origin. Every intermediate
 * Manifold/CrossSection is released, also when a build throws. */
import type { CrossSection, Manifold, ManifoldAPI, SolidPart, Vec3 } from '../types.ts';
export type Pt = [number, number];
/** Material group: [name, role, color, metalness, roughness]. */
export type Mat = readonly [string, SolidPart['role'], string, number, number];
export function dumbbellKit(api: ManifoldAPI) {
  const {Manifold:M,CrossSection:C}=api, owned:(Manifold|CrossSection)[]=[], groups=new Map<string,{mat:Mat;solids:Manifold[]}>();
  const k=<T extends Manifold|CrossSection>(s:T):T=>(owned.push(s),s);
  const move=(s:Manifold,v:Vec3)=>k(s.translate(v));
  const rot=(s:Manifold,v:Vec3)=>k(s.rotate(v));
  /** Axis-aligned box from min to max corner. */
  const box=(min:Vec3,max:Vec3)=>move(k(M.cube(max.map((v,i)=>v-min[i]) as Vec3)),min);
  /** Box of `size` centred at `at`. */
  const boxC=(size:Vec3,at:Vec3)=>move(k(M.cube(size,true)),at);
  const union=(s:Manifold[])=>s.length===1?s[0]:k(M.union(s));
  const cut=(s:Manifold,holes:Manifold[])=>holes.length?k(M.difference([s,...holes])):s;
  const inter=(s:Manifold[])=>k(M.intersection(s));
  const hull=(s:(Manifold|Vec3)[])=>k(M.hull(s));
  /** Cylinders (or cones with d1 ≠ d2) along an axis between two stations, centred at the other two coordinates. */
  const cylX=(x0:number,x1:number,y:number,z:number,d:number,n=32,d1=d)=>move(rot(k(M.cylinder(x1-x0,d/2,d1/2,n)),[0,90,0]),[x0,y,z]);
  const cylY=(y0:number,y1:number,x:number,z:number,d:number,n=32,d1=d)=>move(rot(k(M.cylinder(y1-y0,d/2,d1/2,n)),[-90,0,0]),[x,y0,z]);
  const cylZ=(z0:number,z1:number,x:number,y:number,d:number,n=32,d1=d)=>move(k(M.cylinder(z1-z0,d/2,d1/2,n)),[x,y,z0]);
  const poly=(points:Pt[])=>k(new C([points]));
  /** Rounded rectangle centred on the origin. */
  const rrect=(w:number,h:number,r:number,n=24)=>{const rr=Math.max(.01,Math.min(r,w/2-.01,h/2-.01));return k(k(C.square([w-2*rr,h-2*rr],true)).offset(rr,'Round',2,n));};
  const circle=(d:number,n=48)=>k(C.circle(d/2,n));
  /** Cross-section (u → Y, v → Z) extruded along +X from x0. */
  const extrudeX=(cs:CrossSection,x0:number,t:number,y=0,z=0)=>move(rot(rot(k(cs.extrude(t)),[90,0,0]),[0,0,90]),[x0,y,z]);
  /** Cross-section (u → X, v → Z) extruded along +Y from y0. */
  const extrudeY=(cs:CrossSection,y0:number,t:number,x=0,z=0)=>move(rot(k(cs.extrude(t)),[90,0,0]),[x,y0+t,z]);
  /** Cross-section (u → X, v → Y) extruded along +Z from z0. */
  const extrudeZ=(cs:CrossSection,z0:number,t:number,x=0,y=0)=>move(k(cs.extrude(t)),[x,y,z0]);
  /** Solid of revolution about the X axis from a (radius, x) outline, centred at (y, z). */
  const lathe=(points:Pt[],y=0,z=0,n=48)=>move(rot(k(poly(points).revolve(n)),[0,90,0]),[0,y,z]);
  /** Mirror a solid across the YZ plane (the other end of the dumbbell). */
  const mirrorX=(s:Manifold)=>k(s.mirror([1,0,0]));
  const add=(mat:Mat,...solids:Manifold[])=>{const g=groups.get(mat[0]) ?? {mat,solids:[]};g.solids.push(...solids);groups.set(mat[0],g);};
  /** Both ends: the solid as built at +X and its mirror at -X. */
  const both=(mat:Mat,...solids:Manifold[])=>add(mat,...solids,...solids.map(mirrorX));
  const finish=(label:string,run:()=>void,{turn=true}:{turn?:boolean}={}):SolidPart[]=>{
    const out:SolidPart[]=[];let success=false;
    try {
      run();
      const merged=[...groups.values()].map(({mat,solids})=>({mat,solid:turn?rot(union(solids),[0,0,90]):union(solids)}));
      const all=merged.map(g=>g.solid.boundingBox()),min=[0,1].map(i=>Math.min(...all.map(b=>b.min[i]))),max=[0,1].map(i=>Math.max(...all.map(b=>b.max[i])));
      const shift:Vec3=[-(min[0]+max[0])/2,-(min[1]+max[1])/2,0];
      for(const {mat:[name,role,color,metalness,roughness],solid} of merged)out.push({name,solid:move(solid,shift),role,color,metalness,roughness});
      const hardware=out.find(p=>p.role==='fastener');if(hardware)hardware.authoredFastenerFinish=true;
      for(const part of out)if(part.solid.isEmpty() || part.solid.status()!=='NoError')throw Error(`Invalid ${label} ${part.name}`);
      success=true;return out;
    } finally {const keep=new Set(success?out.map(p=>p.solid):[]);for(const s of owned.reverse())if(!keep.has(s as Manifold))s.delete();}
  };
  return {M,C,k,move,rot,box,boxC,union,cut,inter,hull,cylX,cylY,cylZ,poly,rrect,circle,extrudeX,extrudeY,extrudeZ,lathe,mirrorX,add,both,finish};
}
export type DumbbellKit = ReturnType<typeof dumbbellKit>;
