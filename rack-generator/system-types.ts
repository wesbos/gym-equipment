import type { NumericParams } from './types.ts';
export const SYSTEM_PARTS = ['cable-kraken', 'cable-ares2', 'cable-athena', 'cable-ares1', 'smith-rep'] as const;
export type SystemPartId = typeof SYSTEM_PARTS[number];
/** Whole-rack mechanical families use graph-derived interfaces, not a single hole target. */
export interface RackSystem { id: string; part: SystemPartId; params: NumericParams }
export const isSystemPart = (id: string): id is SystemPartId => (SYSTEM_PARTS as readonly string[]).includes(id);
export const SYSTEM_NAMES: Record<SystemPartId, string> = {
  'cable-kraken': 'Bells of Steel Kraken', 'cable-ares2': 'REP ARES 2.0',
  'cable-athena': 'REP Athena', 'cable-ares1': 'REP ARES 1.0 (historical)', 'smith-rep': 'REP Smith',
};
export const SYSTEM_DEFAULTS: Record<SystemPartId, NumericParams> = {
  'cable-kraken': { sides:3, loading:1, upgrade:0, shroud:0, trolley:1000, adapter:0, anchored:0 },
  'cable-ares2': { sides:3, loading:1, upgrade:0, shroud:1, trolley:1000, handles:1, anchored:0 },
  'cable-athena': { sides:3, loading:1, upgrade:0, shroud:0, trolley:1000, anchored:0 },
  'cable-ares1': { sides:3, loading:1, upgrade:0, shroud:1, trolley:1000, handles:1, anchored:0 },
  'smith-rep': { angle:0, barHeight:1100, safetyHeight:650, outside:0 },
};
export const SYSTEM_NOTE = 'Reconstructed from manufacturer manuals. Published envelope dimensions; bracket contours, pulley centers, routing lengths, first-hole datum and fabrication tolerances are estimated. Static visualization, not certified physical fit.';
