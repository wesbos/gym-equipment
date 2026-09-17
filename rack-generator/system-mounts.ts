import type { LocalBox, NumericParams, Vec3 } from "./types.ts";
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
  // barHeight denotes the shaft centre, not the tilted carriage datum.
  // The local bore is 60 mm in front of the guides. Compensate its rotated
  // vertical offset while keeping every bearing centre on the guide line.
  const carriageZ = p.barHeight - 60 * Math.sin(angle);
  const carriageAt = (local: Vec3): Vec3 => {
    const origin = at(0, carriageZ);
    return [local[0], origin[1] + local[1] * Math.cos(angle) + local[2] * Math.sin(angle),
      origin[2] - local[1] * Math.sin(angle) + local[2] * Math.cos(angle)];
  };
  const barAt = (x: number): Vec3 => carriageAt([x, -60, 0]);
  const barCollisionBoxes = (): LocalBox[] => {
    const bounds = (center: Vec3, size: Vec3): LocalBox => ({
      min: center.map((v, i) => v - size[i] / 2) as Vec3,
      max: center.map((v, i) => v + size[i] / 2) as Vec3,
    });
    return [bounds(barAt(0), [1280, 35, 35]),
      ...[-1, 1].map(side => bounds(barAt(side * (940 - 289.5 / 2)), [289.5, 50, 50]))];
  };
  const stations = [lowerBeam, upperBeam].map((beamZ, index) => {
    const guideZ = index ? top : lowerBeam + p.tube / 2 + 10,
      guideY = at(0, guideZ)[1];
    const stationY = p.outside
      ? -p.tube / 2 - 100.6
      : datum + (Math.round((guideY - datum) / p.pitch - 0.5) + 0.5) * p.pitch;
    return { beamZ, guideZ, guideY, stationY, index };
  });
  return { lowerBeam, upperBeam, top, at, stations, datum, carriageAt, barAt, barCollisionBoxes };
}
export function cableMountTop(p: NumericParams) {
  return (
    p.firstHole + Math.floor((p.height - 180 - p.firstHole) / p.pitch) * p.pitch
  );
}
