import type { AttributionResolver, VendorAttribution } from '../../rack-generator/catalog-contract.ts';
import { buildPrintInstance } from './print-build.ts';
import { SLICER_APPLICATION, SLICER_PROCESS, slicerPalette } from './slicer-metadata.ts';
import { PRINT_NOZZLE, printMinFeature } from '../../rack-generator/print-detail.ts';
import { strToU8, zipSync } from 'fflate';
import { Euler, Matrix4, Vector3 } from 'three';
import type { ManifoldAPI, PartDefinition, RackDoc, SolidPart } from '../../rack-generator/types.ts';
import { resolveAssembly, validateAssembly } from '../../rack-generator/assembly.ts';
import { resolveMaterial } from '../../rack-generator/appearance.ts';
import { packPlate, PRINT_BED, PLATE_ORIGINS } from './print-packing.ts';
import { printableMesh, type PrintMesh } from './print-mesh.ts';

/** Explicit semantic exclusion, including the floor-item contract used by #47. */
export const isPrintInstance = (entry: {kind:string}) => entry.kind !== 'floor-item';
export type PrintLayout = 'laid-out' | 'assembled';
export type PrintScale = 10 | 20;
export interface PrintOptions { layout: PrintLayout; scale?: PrintScale }
export interface PrintReport {
  scale: PrintScale; scaleFactor: number; plates: { name: string; objectIds: number[]; origin: readonly number[] }[];
  excludedInstances: string[];
  unit: 'millimeter'; layout: PrintLayout; instances: number; volumes: number; triangles: number;
  occludedComponents: string[]; overlapPolicy: string; printDetail: string; textureLimitation: string;
  vendorCredits: { part: string; attribution: VendorAttribution }[];
  parts: { id: string; ownerId: string; part: string; objectId: number; plate: string; roles: string[]; position: number[]; sourcePosition: number[]; size: number[]; volumes: number }[];
}
export interface PrintResult { bytes: Uint8Array<ArrayBuffer>; report: PrintReport }
const xml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const number = (v: number) => {
  if (!Number.isFinite(v)) throw Error('Nonfinite print coordinate.');
  // Decimal notation avoids slicer parsers that reject exponents. Float32 geometry
  // is retained to sub-micrometre precision at these millimetre dimensions.
  return v.toFixed(9).replace(/\.?0+$/, '') || '0';
};
const bounds = (meshes: PrintMesh[]) => {
  const min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
  for (const mesh of meshes) for (let i=0;i<mesh.vertices.length;i++) {
    min[i%3]=Math.min(min[i%3],mesh.vertices[i]); max[i%3]=Math.max(max[i%3],mesh.vertices[i]);
  }
  return { min, max, size: max.map((v,i)=>v-min[i]) };
};
const transform = (meshes: PrintMesh[], matrix: Matrix4) => {
  const point = new Vector3();
  for (const mesh of meshes) for (let i=0;i<mesh.vertices.length;i+=3) {
    point.fromArray(mesh.vertices,i).applyMatrix4(matrix); point.toArray(mesh.vertices,i);
  }
};
/** Each physical instance is a build object, with named non-overlapping material
 * volumes. Later catalog components own shared space (e.g. a fastener in steel).
 * This is a print partition, never a modification to source CAD or saved config. */
export function exportPrint3MF(api: ManifoldAPI, input: RackDoc, definitions: readonly PartDefinition[], options: PrintOptions,
  progress?: (done: number, total: number) => void, attributionForPart?: AttributionResolver): PrintResult {
  const doc = validateAssembly(input), resolved = resolveAssembly(doc);
  const entries = resolved.filter(e => isPrintInstance(e));
  const scale = options.scale ?? 10;
  if (scale !== 10 && scale !== 20) throw Error('Print scale must be 1:10 or 1:20.');
  if (!entries.length) throw Error('No rack parts to export.');
  if (!['laid-out','assembled'].includes(options.layout)) throw Error('Unknown print layout.');
  const minFeature = printMinFeature(scale);
  const report: PrintReport = { scale, scaleFactor:1/scale, plates:['Parts','Hardware'].map((name,i)=>({name,objectIds:[],origin:PLATE_ORIGINS[i]})),
    excludedInstances:resolved.filter(e=>!isPrintInstance(e)).map(e=>e.id), unit:'millimeter', layout:options.layout, instances:entries.length, volumes:0, triangles:0,
    occludedComponents:[], overlapPolicy:'Later catalog components own overlaps; earlier volumes are cut with Manifold. Separate rack instances remain independent.',
    printDetail:`Simplified for a ${PRINT_NOZZLE} mm nozzle: laser-cut upright station numbers are omitted and stencil/logo cut features narrower than ${2*PRINT_NOZZLE} mm printed (${minFeature} mm at 1:${scale}) are removed. The on-screen model and GLB keep full detail.`,
    vendorCredits:[], textureLimitation:'Dominant solid colors only. Textures, metallic reflections and roughness are not printable material properties.', parts:[] };
  const objects: string[] = [], items: string[] = [], settings: string[] = [], colors: string[] = [];
  let nextId = 2;
  const groups: {entry:typeof entries[number]; def:PartDefinition; volumes:{source:SolidPart;mesh:PrintMesh}[]; plate:number}[] = [];
  for (const [entryIndex, entry] of entries.entries()) {
    const def = definitions.find(d=>d.id===entry.part);
    if (!def) throw Error(`No CAD builder for ${entry.part}.`);
    const attribution = attributionForPart?.(entry.part);
    if (attribution && !report.vendorCredits.some(credit => credit.part === entry.part))
      report.vendorCredits.push({ part: entry.part, attribution: { ...attribution } });
    // Build-time print detail (#89): number/stencil cuts are fused into solids,
    // so they are suppressed in the builder, never filtered from volumes here.
    const parts = buildPrintInstance(api, def, {...entry, params:{...entry.params, printMinFeature:minFeature}});
    const volumes: { source: SolidPart; mesh: PrintMesh }[] = [];
    let occupied: ReturnType<typeof api.Manifold.union> | undefined;
    try {
      // Check every source, even if it will be fully occluded by a later solid.
      for (const p of parts) if (p.solid.status() !== 'NoError' || p.solid.isEmpty() || !(p.solid.volume()>0))
        throw Error(`${entry.id}/${p.name}: invalid source solid.`);
      for (let i=parts.length-1;i>=0;i--) {
        const source = parts[i];
        const cut = occupied ? source.solid.subtract(occupied) : undefined;
        try {
          const solid = cut ?? source.solid;
          if (solid.status() !== 'NoError') throw Error(`${entry.id}/${source.name}: Manifold overlap cut failed.`);
          if (solid.isEmpty()) report.occludedComponents.push(`${entry.id}/${source.name}`);
          else {
            // Reconstruct from the exact Float32 export coordinates: Boolean
            // slivers can collapse during getMesh()'s double-to-float conversion.
            // Manifold removes those degeneracies and rechecks topology.
            const clean = new api.Manifold(solid.getMesh());
            try { volumes.unshift({source,mesh:printableMesh(clean,`${entry.id}/${source.name}`)}); }
            finally { clean.delete(); }
          }
          const next = api.Manifold.union(occupied ? [occupied,source.solid] : [source.solid]);
          if (next.status() !== 'NoError') { next.delete(); throw Error(`${entry.id}: Manifold overlap union failed.`); }
          occupied?.delete(); occupied = next;
        } finally { cut?.delete(); }
      }
      if (!volumes.length) throw Error(`${entry.id}: no printable volume.`);
      for (const plate of [0,1]) {
        const selected=volumes.filter(v=>(v.source.role==='fastener'?1:0)===plate);
        if(selected.length) groups.push({entry,def,volumes:selected,plate});
      }
    } finally { occupied?.delete(); parts.forEach(p=>p.solid.delete()); }
    progress?.(entryIndex+1, entries.length);
  }
  // Prepare all geometry before packing; this allows deterministic largest-first
  // packing without ever discarding a part when a plate is full.
  for(const group of groups) {
    const meshes=group.volumes.map(v=>v.mesh);
    if(options.layout==='assembled') {
      const matrix=new Matrix4().makeRotationFromEuler(new Euler(...group.entry.rotation));
      matrix.setPosition(...group.entry.position); transform(meshes,matrix);
    } else {
      // Long perforated tubes keep their Z-up frame, base end down (#87): the
      // hole column prints as vertical tunnels without supports. Packing only
      // spins about Z, so they stay standing. Others lie at their lowest height.
      const {size}=bounds(meshes), standing=group.def.printOrientation==='standing';
      if(!standing&&size[0]<size[2]&&size[0]<=size[1]) transform(meshes,new Matrix4().makeRotationY(Math.PI/2));
      else if(!standing&&size[1]<size[2]) transform(meshes,new Matrix4().makeRotationX(Math.PI/2));
      const {min}=bounds(meshes); transform(meshes,new Matrix4().makeTranslation(-min[0],-min[1],-min[2]));
    }
    transform(meshes,new Matrix4().makeScale(1/scale,1/scale,1/scale));
    const {size}=bounds(meshes);
    if(size.some(v=>v>PRINT_BED+1e-6)) throw Error(`${group.entry.id} (${report.plates[group.plate].name}) bbox ${size.map(v=>v.toFixed(2)).join(' × ')} mm exceeds the 256 mm envelope at 1:${scale}. ${scale===10?'Choose the smaller 1:20 scale.':'Export a smaller configuration.'}`);
  }
  const placements=new Map<typeof groups[number],number[]>();
  for(const plate of [0,1]) {
    const onPlate=groups.filter(g=>g.plate===plate);
    if(!onPlate.length) continue;
    if(options.layout==='laid-out') {
      const packed=packPlate(onPlate.map(g=>({name:g.entry.id,size:bounds(g.volumes.map(v=>v.mesh)).size.map(v=>v*scale/10)})),scale);
      onPlate.forEach((g,i)=>{
        const meshes=g.volumes.map(v=>v.mesh);
        if(packed[i].rotated) {
          transform(meshes,new Matrix4().makeRotationZ(Math.PI/2));
          const {min}=bounds(meshes); transform(meshes,new Matrix4().makeTranslation(-min[0],-min[1],-min[2]));
        }
        placements.set(g,[packed[i].x*10/scale,packed[i].y*10/scale,0]);
      });
    } else {
      const {min,size}=bounds(onPlate.flatMap(g=>g.volumes.map(v=>v.mesh)));
      if(size.some(v=>v>PRINT_BED-4+1e-6)) throw Error(`Assembled ${report.plates[plate].name} bbox ${size.map(v=>v.toFixed(2)).join(' × ')} mm exceeds the 256 mm plate at 1:${scale}. ${scale===10?'Choose the smaller 1:20 scale or laid-out arrangement.':'Choose laid-out arrangement.'}`);
      onPlate.forEach(g=>placements.set(g,[-min[0]+20/scale,-min[1]+20/scale,-min[2]]));
    }
  }
  for(const group of groups) {
      const {entry,def,volumes,plate}=group, meshes=volumes.map(v=>v.mesh);
      const position=placements.get(group)!;
      const {min,max}=bounds(meshes);
      if(min.some((v,i)=>v+position[i]<-1e-6)||max.some((v,i)=>v+position[i]>PRINT_BED+1e-6)) throw Error(`${entry.id}: packed bbox is outside the 256 mm plate.`);
      const translation=position.map((v,i)=>v+PLATE_ORIGINS[plate][i]);
      items.push(`<item objectid="${nextId+volumes.length}" transform="1 0 0 0 1 0 0 0 1 ${translation.map(number).join(' ')}"/>`);
      const children: string[] = [], partSettings: string[] = [];
      for (const {source,mesh} of volumes) {
        const color = resolveMaterial(source,doc.appearance,entry.id).color.toUpperCase();
        if (!/^#[0-9A-F]{6}$/.test(color)) throw Error(`Invalid export color for ${entry.id}/${source.name}.`);
        if (!colors.includes(color)) colors.push(color);
        const material = colors.indexOf(color), id = nextId++;
        const vertices: string[] = [], triangles: string[] = [];
        for (let i=0;i<mesh.vertices.length;i+=3) vertices.push(`<vertex x="${number(mesh.vertices[i])}" y="${number(mesh.vertices[i+1])}" z="${number(mesh.vertices[i+2])}"/>`);
        for (let i=0;i<mesh.indices.length;i+=3) triangles.push(`<triangle v1="${mesh.indices[i]}" v2="${mesh.indices[i+1]}" v3="${mesh.indices[i+2]}"/>`);
        report.triangles += triangles.length;
        if (report.triangles > 2_000_000) throw Error('Print export exceeds the 2 million triangle limit. Export a smaller configuration.');
        objects.push(`<object id="${id}" type="model" name="${xml(source.name)}" pid="1" pindex="${material}"><mesh><vertices>${vertices.join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh></object>`);
        children.push(`<component objectid="${id}"/>`);
        partSettings.push(`<part id="${id}" subtype="normal_part"><metadata key="name" value="${xml(source.name)}"/><metadata key="extruder" value="${material+1}"/></part>`);
      }
      const id = nextId++, name = `${entry.id} · ${def.name} · ${report.plates[plate].name}`;
      report.plates[plate].objectIds.push(id);
      objects.push(`<object id="${id}" type="model" name="${xml(name)}"><components>${children.join('')}</components></object>`);
      settings.push(`<object id="${id}"><metadata key="name" value="${xml(name)}"/><metadata key="extruder" value="${colors.indexOf(resolveMaterial(volumes[0].source,doc.appearance,entry.id).color.toUpperCase())+1}"/>${partSettings.join('')}</object>`);
      report.volumes += volumes.length;
      report.parts.push({id:entry.id,ownerId:entry.ownerId,part:entry.part,objectId:id,plate:report.plates[plate].name,roles:[...new Set(volumes.map(v=>v.source.role ?? 'frame'))],position,sourcePosition:entry.position.map(v=>v/scale),size:bounds(meshes).size,volumes:volumes.length});
  }
  const plateSettings = report.plates.map((plate,i)=>`<plate><metadata key="plater_id" value="${i+1}"/><metadata key="plater_name" value="${plate.name}"/><metadata key="locked" value="false"/>${plate.objectIds.map(id=>`<model_instance><metadata key="object_id" value="${id}"/><metadata key="instance_id" value="0"/><metadata key="identify_id" value="${id}"/></model_instance>`).join('')}</plate>`).join('');
  const credits = report.vendorCredits.map(({part,attribution:a}) =>
    `${part}: ${a.vendor}. ${a.credit}. ${a.url}. ${a.trademark}. ${a.reconstruction}`).join('\n');
  const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">${SLICER_APPLICATION}</metadata><metadata name="Designer">BOS STRENGTH print exporter</metadata><metadata name="Title">Printable rack parts 1:${scale}</metadata>${credits ? `<metadata name="Copyright">${xml(credits)}</metadata>` : ''}<metadata name="Description">${xml(`Generated by BOS STRENGTH with a Bambu/Orca compatibility marker. Placeholder 256 mm bed printer with a ${PRINT_NOZZLE} mm nozzle default (${SLICER_PROCESS} process) and Generic PLA colors; select your printer and filaments before slicing. `+report.overlapPolicy+' '+report.printDetail+' '+report.textureLimitation)}</metadata><resources><basematerials id="1">${colors.map(color=>`<base name="${color}" displaycolor="${color}FF"/>`).join('')}</basematerials>${objects.join('')}</resources><build>${items.join('')}</build></model>`;
  const bytes = zipSync({
    '[Content_Types].xml':strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/octet-stream"/><Default Extension="json" ContentType="application/json"/></Types>'),
    '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/3dmodel.model':strToU8(model),
    'Metadata/model_settings.config':strToU8(`<?xml version="1.0" encoding="UTF-8"?><config>${settings.join('')}${plateSettings}</config>`),
    'Metadata/project_settings.config':strToU8(JSON.stringify(slicerPalette(colors))),
    'Metadata/print-report.json':strToU8(JSON.stringify(report,null,2)),
  },{level:6});
  return {bytes,report};
}
