import type { NumericParams, RackDoc } from "./types.ts";
/** 108-inch Kraken uses the 90-inch kit with its lower crossmembers raised18in. */
export const krakenBaseRise = (height: number) =>
  Math.abs(height - 2743.2) < 0.05 ? 457.2 : 0;
export function trolleyStations(p: NumericParams, kraken = false): number[] {
  const min = 250 + (kraken ? krakenBaseRise(p.height) : 0),
    max = Math.min(p.height - 300, 3000);
  const stations = [];
  for (let z = p.firstHole; z <= p.height - p.bore / 2; z += p.pitch)
    if (z >= min && z <= max) stations.push(z);
  if (p.benchSpacing && p.benchSpacing < p.pitch)
    for (let z = p.benchStart; z <= p.benchEnd + 0.001; z += p.benchSpacing)
      if (z >= min && z <= max) stations.push(z);
  return [...new Set(stations.map((z) => Math.round(z * 1e6) / 1e6))].sort(
    (a, b) => a - b,
  );
}
export function lockedTrolley(p: NumericParams, kraken = false) {
  const stations = trolleyStations(p, kraken);
  if (!stations.length) throw Error("No supported trolley locking holes.");
  return stations.reduce(
    (best, z) =>
      Math.abs(z - p.trolley) < Math.abs(best - p.trolley) - 1e-6 ? z : best,
    stations[0],
  );
}
/** Focused assembly-family hook; no graph rewrite and no source frame mutation. */
export function systemLowerCrossmemberStation(
  doc: RackDoc,
  from: string,
  to: string,
) {
  if (
    !doc.systems?.some((s) => s.part === "cable-kraken") ||
    !krakenBaseRise(doc.rack.height)
  )
    return 0;
  // Validation persists the selected posts. Only adjacent rows in that bay
  // receive the raised kit; unrelated extensions retain ordinary beam stations.
  const selected = doc.systems!.some(s => s.part === "cable-kraken" && s.bay?.some((id, i, bay) =>
    i + 2 < bay.length && ((id === from && bay[i + 2] === to) || (id === to && bay[i + 2] === from))));
  return selected ? Math.round(krakenBaseRise(doc.rack.height) / doc.rack.pitch) : 0;
}
