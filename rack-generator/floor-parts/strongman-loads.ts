/** Strongman implements: shared units, plate-load presets and label helpers (metadata only, no Manifold). */
import { PLATE_SPECS, plateStackLength, plateStackRadius, type PlateId } from '../plates.ts';
import type { FloorPart } from '../floor-part.ts';
import type { NumericParams } from '../types.ts';

export const inch = (v: number) => v * 25.4;
export const LB = 0.45359237;
/** Plates per sleeve/horn. Loadable implements offer the presets that fit their loadable length. */
export const LOADS: readonly { label: string; plates: readonly PlateId[] }[] = [
  { label: 'Empty', plates: [] },
  { label: '1 × 45 lb', plates: ['lb45'] },
  { label: '2 × 45 lb', plates: ['lb45', 'lb45'] },
  { label: '4 × 45 lb', plates: ['lb45', 'lb45', 'lb45', 'lb45'] },
  { label: '45 + 25 lb', plates: ['lb45', 'lb25'] },
  { label: '1 × 25 kg bumper', plates: ['kg25'] },
  { label: '2 × 20 kg bumpers', plates: ['kg20', 'kg20'] },
  { label: '1 × 10 kg bumper', plates: ['kg10'] },
];
export const loadPlates = (load: number): readonly PlateId[] => LOADS[load]?.plates ?? [];
/** Load options that fit `sleeve` mm of loadable length, optionally capped by plate diameter. */
export const loadOptions = (sleeve: number, maxDiameter = Infinity) =>
  LOADS.map((l, i) => [l, i] as const).filter(([l]) => plateStackLength(l.plates) <= sleeve + 1e-6 && l.plates.every(p => PLATE_SPECS[p].diameter <= maxDiameter)).map(([, i]) => i);
export const loadRadius = (load: number) => plateStackRadius(loadPlates(load));
export const loadLength = (load: number) => plateStackLength(loadPlates(load));
export const loadParam = (sleeve: number, suffix: string, key = 'load', maxDiameter = Infinity) =>
  ({ key, label: 'Plates', default: 0, options: loadOptions(sleeve, maxDiameter), format: (v: number) => v ? `${LOADS[v]?.label ?? v} ${suffix}` : 'Empty' });
export const kgLb = (kg: number) => `${kg} kg / ${Math.round(kg / LB)} lb`;
export const lbKg = (lb: number) => `${lb} lb / ${Math.round(lb * LB)} kg`;
/** Index-param lookup that throws a user-facing error for off-list values. */
export function pick<T>(table: readonly T[], index: number, noun: string): T {
  const row = table[index]; if (row === undefined) throw Error(`Unsupported ${noun}.`); return row;
}
export type StrongmanPart = FloorPart & { defaults: NumericParams };
