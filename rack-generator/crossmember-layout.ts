import { gridProfile } from './profiles.ts';
import type { ConnectionEdge, NumericParams, RackDoc } from './types.ts';

/** Shared by frame geometry and rail attachments so their hole centres stay coincident. */
export function crossmemberLayout(
  doc: Pick<RackDoc, 'rack' | 'uprights' | 'profileId'>,
  edge: ConnectionEdge,
  part: string,
  { rise = 0, lowerHole = 0 } = {},
) {
  const r = doc.rack, profile = gridProfile(doc.profileId);
  const a = doc.uprights[edge.from], b = doc.uprights[edge.to];
  const stride = a.y === b.y ? profile.sideStride ?? 1 : 1;
  // Keep both flange bolts on drilled upright stations, including coarse side-face grids.
  const plateHeight = part === 'branded-crossmember' ? 300 : 50 + Math.max(stride, Math.round(100 / r.pitch), 1) * r.pitch;
  const height = Math.min(r.height, a.height ?? r.height, b.height ?? r.height);
  const upper = Math.floor((height - 25 - r.firstHole) / r.pitch) - Math.round((plateHeight - 50 + rise) / r.pitch);
  const hole = edge.level === 'upper' ? Math.floor(upper / stride) * stride : lowerHole;
  const z = r.firstHole + hole * r.pitch - 25;
  const params: NumericParams = { plateHeight };
  if (part === 'crossmember-flush' || part === 'profile-nameplate-flush') {
    // Extend the bracket above its upper bolt and put the tube against that top edge.
    // The original plateHeight still defines the two bolt centres, not the new silhouette.
    params.flangeTop = edge.level === 'upper' ? height - z : plateHeight;
    params.beamCenter = params.flangeTop - r.tube / 2;
  }
  return { hole, z, beamCenter: z + (params.beamCenter ?? plateHeight / 2), params };
}
