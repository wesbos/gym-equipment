import {test} from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {unzipSync,strFromU8} from 'fflate';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {createAssembly,resolveAssembly} from '../../rack-generator/assembly.ts';
import {definitions} from '../../rack-generator/catalog.ts';
import {HARDWARE_FINISHES} from '../../rack-generator/appearance.ts';
import type {PartDefinition} from '../../rack-generator/types.ts';
import {exportPrint3MF,isPrintInstance} from './print-3mf.ts';
const api = await Module(); api.setup();
const list = <T>(value:T|T[]|undefined):T[] => value===undefined?[]:Array.isArray(value)?value:[value];
interface Vertex {x:string;y:string;z:string}
interface Triangle {v1:string;v2:string;v3:string}
interface ObjectNode {id:string;name:string;pid?:string;pindex?:string;mesh?:{vertices:{vertex:Vertex[]};triangles:{triangle:Triangle[]}};components?:{component:{objectid:string}[]}}
interface Model {unit:string;resources:{basematerials:{id:string;base:{displaycolor:string}[]};object:ObjectNode[]};build:{item:{objectid:string;transform?:string}[]}}
function inspect(bytes:Uint8Array) {
  const files=unzipSync(bytes), parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'',parseAttributeValue:false});
  for (const [path,content] of Object.entries(files)) if (/\.xml$|\.rels$|\.model$/.test(path)) assert.equal(XMLValidator.validate(strFromU8(content)),true,path);
  const model=parser.parse(strFromU8(files['3D/3dmodel.model'])).model as Model;
  const objects=list(model.resources.object), items=list(model.build.item), byId=new Map(objects.map(o=>[o.id,o]));
  assert.equal(byId.size,objects.length); assert.equal(model.unit,'millimeter');
  const rels=parser.parse(strFromU8(files['_rels/.rels'])).Relationships.Relationship;
  assert.ok(files[rels.Target.slice(1)]);
  const materials=list(model.resources.basematerials.base);
  for (const o of objects) {
    if (o.mesh) {
      assert.equal(o.pid,model.resources.basematerials.id); assert.ok(materials[Number(o.pindex)]);
      const verts=list(o.mesh.vertices.vertex).flatMap(v=>[Number(v.x),Number(v.y),Number(v.z)]);
      const inds=list(o.mesh.triangles.triangle).flatMap(t=>[Number(t.v1),Number(t.v2),Number(t.v3)]);
      assert.ok(verts.every(Number.isFinite));assert.ok(inds.every(i=>Number.isInteger(i)&&i>=0&&i<verts.length/3));
      // Round-trip the actual decimal XML triangles through Manifold, not the
      // in-memory render mesh or just an XML face count.
      const solid=new api.Manifold(new api.Mesh({numProp:3,vertProperties:new Float32Array(verts),triVerts:new Uint32Array(inds)}));
      try {assert.equal(solid.status(),'NoError',o.name);assert.ok(solid.volume()>0,o.name);} finally {solid.delete();}
    } else for (const child of list(o.components?.component)) {
      assert.ok(byId.get(child.objectid)?.mesh);assert.ok(Number(child.objectid)<Number(o.id),'children precede parents');
    }
  }
  for(const item of items) assert.ok(byId.get(item.objectid)?.components);
  return {files,model,objects,items,byId,materials};
}
const single = () => {
  const doc=createAssembly({emptyAccessories:true}); doc.removed=resolveAssembly(doc).filter(e=>e.id!=='front-left').map(e=>e.id);return doc;
};
const cubeDef:PartDefinition={id:'upright',name:'Test & "quoted" <part>',defaults:{},category:'Test',build:api=>[
  {name:'frame',role:'frame',solid:api.Manifold.cube([10,20,30])},
  {name:'bolt',role:'fastener',solid:api.Manifold.cube([5,20,30])},
]};
test('3MF partition removes overlapping volume, preserves colors and physical assembly',()=>{
  const doc=single();doc.appearance={hardwareFinish:'gold',overrides:{'front-left':'#ff0000'}};
  const result=exportPrint3MF(api,doc,[cubeDef],{layout:'laid-out'}),archive=inspect(result.bytes);
  assert.equal(result.report.instances,1);assert.equal(result.report.volumes,2);
  assert.deepEqual(archive.materials.map(m=>m.displaycolor),['#FF0000FF',HARDWARE_FINISHES.gold.color.toUpperCase()+'FF']);
  assert.equal(archive.byId.get(archive.items[0].objectid)?.name,'front-left · Test & "quoted" <part> · Parts');
  const solids=archive.objects.filter(o=>o.mesh).map(o=>new api.Manifold(new api.Mesh({numProp:3,vertProperties:new Float32Array(o.mesh!.vertices.vertex.flatMap(v=>[+v.x,+v.y,+v.z])),triVerts:new Uint32Array(o.mesh!.triangles.triangle.flatMap(t=>[+t.v1,+t.v2,+t.v3]))})));
  const overlap=solids[0].intersect(solids[1]);
  try {assert.ok(Math.abs(solids.reduce((s,m)=>s+m.volume(),0)-6)<1e-6);} finally {overlap.delete();solids.forEach(s=>s.delete());}
  result.report.parts[0].size.forEach((v,i)=>assert.ok(Math.abs(v-[3,2,.5][i])<1e-8));
});
test('3MF source validation, empty assembly and covered components are explicit',()=>{
  assert.throws(()=>exportPrint3MF(api,single(),[],{layout:'laid-out'}),/No CAD builder/);
  const invalid={...cubeDef,build:()=>[{name:'empty',role:'frame' as const,solid:api.Manifold.cube([0,0,0])}]};
  assert.throws(()=>exportPrint3MF(api,single(),[invalid],{layout:'laid-out'}),/invalid source solid/);
  const covered={...cubeDef,build:()=>[{name:'hidden',role:'frame' as const,solid:api.Manifold.cube([1,1,1])},{name:'cover',role:'frame' as const,solid:api.Manifold.cube([2,2,2])}]};
  const result=exportPrint3MF(api,single(),[covered],{layout:'laid-out'});
  assert.deepEqual(result.report.occludedComponents,['front-left/hidden']);assert.equal(result.report.volumes,1);
  const doc=single();doc.removed.push('front-left');assert.throws(()=>exportPrint3MF(api,doc,[cubeDef],{layout:'laid-out'}),/No rack parts/);
});
test('assembly coordinates are baked in millimetres and layout leaves input unchanged',()=>{
  const doc=single(),before=JSON.stringify(doc),entry=resolveAssembly(doc)[0];
  const result=exportPrint3MF(api,doc,[cubeDef],{layout:'assembled'}),archive=inspect(result.bytes);
  assert.ok(archive.items.every(i=>i.transform));
  const coords=archive.objects.filter(o=>o.mesh).flatMap(o=>o.mesh!.vertices.vertex.map(v=>[+v.x,+v.y,+v.z]));
  assert.equal(Math.min(...coords.map(v=>v[0])),entry.position[0]/10);
  assert.equal(Math.min(...coords.map(v=>v[1])),entry.position[1]/10);
  assert.equal(JSON.stringify(doc),before);
});
test('complete rack XML carries exact duplication, per-side overrides, dimensions and slicer materials',()=>{
  const doc=createAssembly();doc.appearance={hardwareFinish:'gold',overrides:{'jhooks-front:left':'#fe0123','jhooks-front:right':'#1234fe'}};
  const entries=resolveAssembly(doc),result=exportPrint3MF(api,doc,definitions,{layout:'laid-out'}),archive=inspect(result.bytes);
  assert.equal(archive.items.length,result.report.parts.length);assert.equal(result.report.instances,14);
  assert.equal(result.report.parts.filter(p=>p.part==='upright').length,4);
  for(const p of result.report.parts.filter(p=>p.part==='upright')) assert.ok(Math.abs(Math.max(...p.size)-203.2)<.001);
  assert.ok(archive.materials.some(m=>m.displaycolor==='#FE0123FF'));assert.ok(archive.materials.some(m=>m.displaycolor==='#1234FEFF'));
  const palette=JSON.parse(strFromU8(archive.files['Metadata/project_settings.config'])).filament_colour;
  assert.deepEqual(palette,archive.materials.map(m=>m.displaycolor.slice(0,7)));
  const settings=new XMLParser({ignoreAttributes:false,attributeNamePrefix:''}).parse(strFromU8(archive.files['Metadata/model_settings.config']));
  assert.equal(settings.config.object.length,result.report.parts.length);
  for(const object of settings.config.object) for(const part of list<{id:string;metadata:{key:string;value:string}[]}>(object.part)) {
    const material=Number(archive.byId.get(String(part.id))!.pindex);
    assert.equal(Number(part.metadata.find(m=>m.key==='extruder')!.value),material+1);
  }
  for(const plate of result.report.plates) {
    const parts=result.report.parts.filter(p=>p.plate===plate.name);
    for(const part of parts) {
      assert.ok(part.position.every((v,i)=>v>=0&&v+part.size[i]<=256.000001));
      assert.equal(part.roles.includes('fastener'),plate.name==='Hardware');
      for(const other of parts) if(other!==part) assert.ok([0,1].some(i=>part.position[i]+part.size[i]<=other.position[i]+1e-6||other.position[i]+other.size[i]<=part.position[i]+1e-6));
    }
  }
  assert.equal(result.report.triangles,archive.objects.reduce((n,o)=>n+(o.mesh?list(o.mesh.triangles.triangle).length:0),0));
});
for(const def of definitions) test(`print partition and XML round-trip: ${def.id}`,()=>{
  // Use a single physical slot to exercise every registered CAD builder,
  // including vendor solids that need specialized assembly mount constraints.
  const adapter={...def,id:'upright',build:()=>def.build(api,def.defaults)};
  const result=exportPrint3MF(api,single(),[adapter],{layout:'laid-out'});
  inspect(result.bytes);assert.ok(result.report.volumes>0);
});
test('vendor export credits retain every attribution field without replacing generator branding', () => {
  const attribution = {vendor:'Vendor & Co',url:'https://example.com/part',credit:'Designed by Vendor',trademark:'Vendor® <part>',reconstruction:'Estimated interface; fit unverified.'};
  const result=exportPrint3MF(api,single(),[cubeDef],{layout:'laid-out'},undefined,()=>attribution);
  const files=unzipSync(result.bytes),parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:''});
  const metadata=parser.parse(strFromU8(files['3D/3dmodel.model'])).model.metadata as {name:string;'#text':string}[];
  const credit=metadata.find(m=>m.name==='Copyright')!['#text'];
  for(const value of Object.values(attribution)) assert.ok(credit.includes(value));
  assert.equal(metadata.find(m=>m.name==='Designer')!['#text'],'BOS STRENGTH print exporter');
  assert.deepEqual(JSON.parse(strFromU8(files['Metadata/print-report.json'])).vendorCredits,[{part:'upright',attribution}]);
});

test('both presets scale every geometry coordinate, plate-local position and source position uniformly',()=>{
  const doc=single();
  for(const layout of ['laid-out','assembled'] as const) {
    const a=exportPrint3MF(api,doc,[cubeDef],{layout,scale:10}),b=exportPrint3MF(api,doc,[cubeDef],{layout,scale:20});
    assert.equal(a.report.scale,10);assert.equal(b.report.scaleFactor,.05);
    const av=inspect(a.bytes).objects.filter(o=>o.mesh).flatMap(o=>o.mesh!.vertices.vertex);
    const bv=inspect(b.bytes).objects.filter(o=>o.mesh).flatMap(o=>o.mesh!.vertices.vertex);
    av.forEach((v,i)=>['x','y','z'].forEach(k=>assert.ok(Math.abs(+v[k as keyof Vertex]/2-+bv[i][k as keyof Vertex])<1e-8)));
    a.report.parts.forEach((p,i)=>{
      for(const key of ['size','position','sourcePosition'] as const) p[key].forEach((v,j)=>assert.ok(Math.abs(v/2-b.report.parts[i][key][j])<1e-8));
      assert.equal(p.id,'front-left');assert.equal(p.ownerId,'front-left');
    });
  }
});
test('bbox and packing overflow fail explicitly; smaller scale succeeds without individual resizing',()=>{
  const long={...cubeDef,build:()=>[{name:'long',role:'frame' as const,solid:api.Manifold.cube([3000,30,30])}]};
  assert.throws(()=>exportPrint3MF(api,single(),[long],{layout:'laid-out'}),/bbox.*256.*1:20/);
  assert.ok(exportPrint3MF(api,single(),[long],{layout:'laid-out',scale:20}).report.parts[0].size.includes(150));
  const wide={...cubeDef,build:()=>[{name:'wide',role:'frame' as const,solid:api.Manifold.cube([2400,2400,20])}]};
  const doc=single();doc.removed=doc.removed.filter(id=>id!=='front-right');
  assert.throws(()=>exportPrint3MF(api,doc,[wide],{layout:'laid-out'}),/cannot be packed.*1:20/);
  assert.equal(exportPrint3MF(api,doc,[wide],{layout:'laid-out',scale:20}).report.parts.length,2);
});
test('explicit roles separate true hardware only, including hardware-only parts; floor instances are excluded',()=>{
  assert.equal(isPrintInstance({kind:'floor-item'}),false);assert.equal(isPrintInstance({kind:'accessory'}),true);
  const hardware={...cubeDef,build:()=>[{name:'bolt',role:'fastener' as const,solid:api.Manifold.cube([5,5,5])}]};
  const result=exportPrint3MF(api,single(),[hardware],{layout:'laid-out'});
  assert.equal(result.report.plates[0].objectIds.length,0);assert.equal(result.report.parts[0].plate,'Hardware');
  const rods={...cubeDef,build:()=>[{name:'rod',role:'rod' as const,solid:api.Manifold.cube([5,5,5])},{name:'handle',role:'handle' as const,solid:api.Manifold.cube([5,5,5]).translate([10,0,0])}]};
  const r=exportPrint3MF(api,single(),[rods],{layout:'laid-out'});
  assert.equal(r.report.plates[1].objectIds.length,0);assert.deepEqual(r.report.parts[0].roles,['rod','handle']);
});
