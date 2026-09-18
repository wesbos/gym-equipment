import type { NumericParams, PartDefinition, SolidPart, Vec2, Vec3 } from '../types.ts';
import type { ManifoldAPI } from '../types.ts';
import { BAR, BARBELL } from '../floor-parts/barbell.ts';
import { floorDefinition } from '../floor-part.ts';
import { mechanical } from './system-geometry.ts';
/** Standalone Olympic bar in the Smith bar's sleeve/knurl-ring language (smith.ts), without the carriage.
 * Local X along the bar, origin on the floor under its centre, axis at BAR.axisZ. */
export function buildBarbell(api: ManifoldAPI, p: NumericParams): SolidPart[] {
  if (![0, 1].includes(p.finish ?? 0)) throw Error('Unsupported barbell finish.');
  const z = BAR.axisZ, r = BAR.shaft / 2, at = (x: number): Vec3 => [x, 0, z];
  const parts = mechanical(api, g => {
    g.add('28.5 mm bar shaft', g.cylinder(2 * BAR.shaftHalf + 2, r, 'x', at(0), 40), 'rod');
    // Knurl: shallow 5 mm sawtooth revolved around the shaft; smooth gaps leave the IWF/IPF grip rings.
    const knurl = (from: number, to: number) => { const loop: Vec2[] = [[r - .6, from]]; for (let y = from; y < to - .01; y += 2.5) loop.push([(y - from) % 5 < 2.5 ? r + .12 : r - .2, y]); return [...loop, [r - .2, to], [r - .6, to]] as Vec2[]; };
    const zones: [number, number][] = [[-BAR.centerKnurl, BAR.centerKnurl]];
    for (const side of [-1, 1]) { let from = BAR.knurl[0]; for (const ring of BAR.rings) { zones.push(side > 0 ? [from, ring - 2.5] : [-(ring - 2.5), -from]); from = ring + 2.5; } zones.push(side > 0 ? [from, BAR.knurl[1]] : [-BAR.knurl[1], -from]); }
    const bands = zones.map(([a, b]) => g.move(g.rotate(g.keep(g.keep(new api.CrossSection([knurl(a, b)])).revolve(40)), [0, 90, 0]), [0, 0, z]));
    g.add('Knurled grip and IWF/IPF ring marks', g.union(bands), 'handle');
    for (const side of [-1, 1]) {
      const collar = BAR.shaftHalf + BAR.collar / 2, sleeve = BAR.shaftHalf + BAR.collar + BAR.sleeve / 2;
      g.add('Sleeve shoulder collar', g.cylinder(BAR.collar, BAR.collarDiameter / 2, 'x', at(side * collar), 48), 'sleeve');
      g.add('415 mm loadable Olympic sleeve', g.ring(BAR.sleeve, BAR.sleeveDiameter / 2, 12, 'x', at(side * sleeve)), 'sleeve');
      g.add('Sleeve retaining snap ring', g.ring(3, BAR.sleeveDiameter / 2 + .8, BAR.sleeveDiameter / 2 - 1, 'x', at(side * (BAR.shaftHalf + BAR.collar + 6))), 'source');
      g.add('Sleeve end cap', g.cylinder(4, 18, 'x', at(side * (BAR.length / 2 - 2.5)), 32), 'source');
    }
  });
  const oxide = p.finish === 1;
  for (const part of parts) Object.assign(part, part.role === 'rod' ? { color: oxide ? '#2b2d30' : '#d9dee2', metalness: oxide ? .7 : 1, roughness: oxide ? .42 : .16 }
    : part.role === 'handle' ? { color: oxide ? '#1f2123' : '#aab0b5', metalness: .85, roughness: .62 }
    : part.role === 'sleeve' ? { color: '#dfe3e6', metalness: 1, roughness: .14 } : { color: '#56595d', metalness: .8, roughness: .35 });
  return parts;
}
export const definitions: PartDefinition[] = [floorDefinition(BARBELL, buildBarbell)];
