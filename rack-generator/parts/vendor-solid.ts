import type { ManifoldAPI, Manifold, CrossSection, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { MaterialRole } from '../appearance.ts';
/** Local ownership scope: every intermediate is released, including on exceptions. */
export function vendorSolid(api: ManifoldAPI, build: (s: ReturnType<typeof scope>) => void): SolidPart[] {
 const s = scope(api);
 try { build(s); return s.parts; } catch (error) { s.parts.length = 0; throw error; }
 finally { const saved = new Set(s.parts.map(p => p.solid)); s.owned.reverse().forEach(v => { if (!saved.has(v as Manifold)) v.delete(); }); }
}
function scope({ Manifold: M, CrossSection: C }: ManifoldAPI) {
 const owned: (Manifold | CrossSection)[] = [], parts: SolidPart[] = [];
 const keep = <T extends Manifold | CrossSection>(v: T): T => (owned.push(v), v);
 const box = (size: Vec3, at: Vec3 = [0,0,0]) => keep(keep(M.cube(size,true)).translate(at));
 const round = (w: number, h: number, depth: number, radius: number, at: Vec3 = [0,0,0]) => keep(keep(keep(keep(C.square([w-2*radius,h-2*radius],true)).offset(radius,'Round',32)).extrude(depth)).translate([at[0],at[1],at[2]-depth/2]));
 const cylinder = (r: number, length: number, at: Vec3, rotation: Vec3 = [0,0,0], segments = 48) => keep(keep(keep(M.cylinder(length,r,r,segments,true)).rotate(rotation)).translate(at));
 const plate = (points: Vec2[], thickness: number) => keep(keep(new C([points])).extrude(thickness));
 const add = (name: string, solid: Manifold, role: MaterialRole = 'source', color = '#303236', metalness = .5, roughness = .4) => {
  if(solid.isEmpty() || solid.status() !== 'NoError') throw Error(`Invalid vendor feature: ${name}`);
  parts.push({name,solid,role,color,metalness,roughness});
 };
 const bolt = (name: string, at: Vec3, diameter: number, length: number, rotation: Vec3 = [90,0,0]) => {
  const shaft = keep(M.cylinder(length,diameter/2,diameter/2,32,true));
  const head = keep(keep(M.cylinder(6,diameter*.85,diameter*.85,6,true)).translate([0,0,length/2+3]));
  const nut = keep(keep(M.cylinder(7,diameter*.85,diameter*.85,6,true)).translate([0,0,-length/2-3.5]));
  const washers=[-1,1].map(side=>keep(keep(M.cylinder(2,diameter,diameter,48,true)).translate([0,0,side*length/2])));
  add(name,keep(keep(keep(M.union([shaft,head,nut,...washers])).rotate(rotation)).translate(at)),'fastener','#c4c6c8',.85,.25);
 };
 return { M,C,owned,parts,keep,box,round,cylinder,plate,add,bolt };
}
