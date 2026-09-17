import { SLICER_APPLICATION, slicerPalette } from './slicer-metadata.ts';
import { strToU8, zipSync } from 'fflate';
import { Euler, Matrix4, Vector3 } from 'three';
import type { ManifoldAPI, PartDefinition, RackDoc, SolidPart } from '../../rack-generator/types.ts';
import { resolveAssembly, validateAssembly } from '../../rack-generator/assembly.ts';
import { resolveMaterial } from '../../rack-generator/appearance.ts';
import { printableMesh, type PrintMesh } from './print-mesh.ts';

export type PrintLayout = 'laid-out' | 'assembled';
export interface PrintOptions { layout: PrintLayout }
export interface PrintReport {
  unit: 'millimeter'; layout: PrintLayout; instances: number; volumes: number; triangles: number;
  occludedComponents: string[]; overlapPolicy: string; textureLimitation: string;
  parts: { id: string; ownerId: string; part: string; size: number[]; volumes: number }[];
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
  progress?: (done: number, total: number) => void): PrintResult {
  const doc = validateAssembly(input), entries = resolveAssembly(doc);
  if (!entries.length) throw Error('No rack parts to export.');
  if (!['laid-out','assembled'].includes(options.layout)) throw Error('Unknown print layout.');
  const report: PrintReport = { unit:'millimeter', layout:options.layout, instances:entries.length, volumes:0, triangles:0,
    occludedComponents:[], overlapPolicy:'Later catalog components own overlaps; earlier volumes are cut with Manifold. Separate rack instances remain independent.',
    textureLimitation:'Dominant solid colors only. Textures, metallic reflections and roughness are not printable material properties.', parts:[] };
  const objects: string[] = [], items: string[] = [], settings: string[] = [], colors: string[] = [];
  let nextId = 2, cursor = 0;
  for (const [entryIndex, entry] of entries.entries()) {
    const def = definitions.find(d=>d.id===entry.part);
    if (!def) throw Error(`No CAD builder for ${entry.part}.`);
    const parts = def.build(api, {...def.defaults,...entry.params});
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
      const meshes = volumes.map(v=>v.mesh);
      if (options.layout === 'laid-out') {
        // Minimum axis-aligned height. Exact proper rotations preserve winding.
        const {size} = bounds(meshes);
        if (size[0] < size[2] && size[0] <= size[1]) transform(meshes,new Matrix4().makeRotationY(Math.PI/2));
        else if (size[1] < size[2]) transform(meshes,new Matrix4().makeRotationX(Math.PI/2));
        const {min,size:orientedSize} = bounds(meshes);
        transform(meshes,new Matrix4().makeTranslation(-min[0],-min[1],-min[2]));
        items.push(`<item objectid="${nextId + volumes.length}" transform="1 0 0 0 1 0 0 0 1 ${number(cursor)} 0 0"/>`);
        cursor += orientedSize[0] + 20;
      } else {
        const matrix = new Matrix4().makeRotationFromEuler(new Euler(...entry.rotation));
        matrix.setPosition(...entry.position); transform(meshes,matrix);
        items.push(`<item objectid="${nextId + volumes.length}"/>`);
      }
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
      const id = nextId++, name = `${entry.id} · ${def.name}`;
      objects.push(`<object id="${id}" type="model" name="${xml(name)}"><components>${children.join('')}</components></object>`);
      settings.push(`<object id="${id}"><metadata key="name" value="${xml(name)}"/><metadata key="extruder" value="1"/>${partSettings.join('')}</object>`);
      report.volumes += volumes.length;
      report.parts.push({id:entry.id,ownerId:entry.ownerId,part:entry.part,size:bounds(meshes).size,volumes:volumes.length});
    } finally { occupied?.delete(); parts.forEach(p=>p.solid.delete()); }
    progress?.(entryIndex+1, entries.length);
  }
  const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">${SLICER_APPLICATION}</metadata><metadata name="Designer">BOS STRENGTH print exporter</metadata><metadata name="Title">Printable rack parts</metadata><metadata name="Description">${xml('Generated by BOS STRENGTH with a Bambu/Orca compatibility marker. Placeholder 256 mm bed, 0.4 mm nozzle and Generic PLA colors; select your printer and filament profiles before slicing. '+report.overlapPolicy+' '+report.textureLimitation)}</metadata><resources><basematerials id="1">${colors.map(color=>`<base name="${color}" displaycolor="${color}FF"/>`).join('')}</basematerials>${objects.join('')}</resources><build>${items.join('')}</build></model>`;
  const bytes = zipSync({
    '[Content_Types].xml':strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="config" ContentType="application/octet-stream"/><Default Extension="json" ContentType="application/json"/></Types>'),
    '_rels/.rels':strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/3dmodel.model':strToU8(model),
    'Metadata/model_settings.config':strToU8(`<?xml version="1.0" encoding="UTF-8"?><config>${settings.join('')}</config>`),
    'Metadata/project_settings.config':strToU8(JSON.stringify(slicerPalette(colors))),
    'Metadata/print-report.json':strToU8(JSON.stringify(report,null,2)),
  },{level:6});
  return {bytes,report};
}
