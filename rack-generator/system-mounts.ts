import type { NumericParams, Vec3 } from "./types.ts";
/** One coordinate contract for Smith solids, mount metadata and collision bodies. */
export function smithLayout(p: NumericParams) {
  const upperStation = Math.floor((p.height - 25 - p.firstHole) / p.pitch) - 2;
  const lowerBeam = p.firstHole + p.pitch,
    upperBeam = p.firstHole + (upperStation + 1) * p.pitch;
  const top = upperBeam - p.tube / 2 - 10,
    angle = (p.angle * Math.PI) / 180,
    datum = p.tube / 2 + 62.5;
  const baseY = p.outside
    ? -p.tube / 2 - 100.6
    : datum +
      (0.5 + Math.ceil(Math.max(0, -Math.tan(angle) * (top - 80)) / p.pitch)) *
        p.pitch;
  const at = (x: number, z: number): Vec3 => [
    x,
    baseY + Math.tan(angle) * (z - 80),
    z,
  ];
  const stations = [lowerBeam, upperBeam].map((beamZ, index) => {
    const guideZ = index ? top : lowerBeam + p.tube / 2 + 10,
      guideY = at(0, guideZ)[1];
    const stationY = p.outside
      ? -p.tube / 2 - 100.6
      : datum + (Math.round((guideY - datum) / p.pitch - 0.5) + 0.5) * p.pitch;
    return { beamZ, guideZ, guideY, stationY, index };
  });
  return { lowerBeam, upperBeam, top, at, stations, datum };
}
export function cableMountTop(p: NumericParams) {
  return (
    p.firstHole + Math.floor((p.height - 180 - p.firstHole) / p.pitch) * p.pitch
  );
}
