import type { MaterialRole } from '../appearance.ts';
/** Audited CAD component roles. Exact source names are scoped to each definition;
 * brightness, metallic values and substring matches never decide appearance.
 * Mixed source groups (dip horn plates/bolts) are classified by feature index.
 */
const roles: Record<string, Record<string, MaterialRole>> = {
  'j-hook-standard': { 'bolts.293': 'fastener', 'Retaining pin': 'rod', 'solid.325': 'frame', 'standard-j-hooks.102': 'fastener', 'uhmw.026': 'liner' },
  'j-hook-roller': { 'roller.012': 'sleeve', 'Retaining pin': 'rod', 'solid.323': 'frame', 'standard-j-hooks.100': 'fastener', 'uhmw.024': 'liner' },
  'j-hook-sandwich': { 'hooks.012': 'fastener', 'Retaining pin': 'rod', 'solid.321': 'frame', 'uhmw-hooks-and-sleeves.012': 'liner' },
  'spotter-arm': { 'solid.319': 'frame', 'uhmw-sleeves.012': 'liner' },
  'dip-horn': { arms: 'handle', body: 'frame' },
  'dip-bar-adjustable': { 'Body.003': 'frame', 'Arm.003': 'handle', 'Bolts.003': 'fastener', 'Controls.003': 'handle', 'EndChamfer_2.003': 'fastener', 'Hex.003': 'fastener', 'Joint2.001': 'source', 'Joints.003': 'rod', 'Pads.003': 'liner', 'Plate.003': 'source', 'Tightener.003': 'handle' },
  landmine: { 'body.001': 'frame', 'bolts-and-rings': 'fastener' },
  monolift: { 'body.004': 'frame', 'bolts.020': 'fastener', 'inner.001': 'liner' },
  'single-bar-holder': { 'body.007': 'sleeve', 'bolts.022': 'fastener' },
  'storage-pin-short': { 'nut.001': 'fastener', 'solid.040': 'rod' },
  'storage-pin-long': { 'bolt.005': 'fastener', 'solid.042': 'rod' },
};
export function attachmentMaterialRole(part: string, name: string, index: number): MaterialRole {
  if (part === 'dip-horn' && name === 'bolts-and-metal-plates') return index >= 9 ? 'fastener' : 'frame';
  if (part === 'landmine' && index === 0) return 'sleeve';
  return roles[part]?.[name] ?? 'source';
}
