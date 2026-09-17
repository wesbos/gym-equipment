import { lockedTrolley, krakenBaseRise } from "./cable-stations.ts";
import { smithLayout, cableMountTop } from "./system-mounts.ts";
import type {
  RackDoc,
  ResolvedInstance,
  NumericParams,
  LocalBox,
  Vec3,
  Mount,
  Face,
} from "./types.ts";
import {
  isSystemPart,
  SYSTEM_DEFAULTS,
  SYSTEM_NAMES,
  type RackSystem,
  type SystemPartId,
} from "./system-types.ts";
import { gridProfile } from "./profiles.ts";
const close = (a: number, b: number) => Math.abs(a - b) < 0.05;
const require = (condition: unknown, message: string): void => {
  if (!condition) throw Error(message);
};
export function systemLayout(doc: RackDoc) {
  const nodes = Object.entries(doc.uprights).filter(
    ([id]) => !doc.removed.includes(id),
  );
  require(nodes.length === 4 ||
    nodes.length ===
      6, "Cable/Smith systems require a rectangular 4- or 6-post rack.");
  const ys = [...new Set(nodes.map(([, n]) => n.y))].sort((a, b) => a - b);
  const rows = ys.map((y) =>
    nodes.filter(([, n]) => n.y === y).sort((a, b) => a[1].x - b[1].x),
  );
  require(rows.length === nodes.length / 2 &&
    rows.every(
      (r) => r.length === 2,
    ), "Cable/Smith systems require two aligned upright columns.");
  require(rows.every(
    (r) =>
      close(r[0][1].x, rows[0][0][1].x) && close(r[1][1].x, rows[0][1][1].x),
  ), "Cable/Smith upright columns must align.");
  const width = rows[0][1][1].x - rows[0][0][1].x;
  require(close(
    width - doc.rack.tube,
    gridProfile(doc.profileId).widths.at(-1)!,
  ), "System requires the manufacturer rack width.");
  for (let j = 0; j < rows.length - 1; j++)
    for (let side = 0; side < 2; side++)
      for (const level of ["upper", "lower"]) {
        const from = rows[j][side][0],
          to = rows[j + 1][side][0];
        require(doc.connections.some(
          (e) =>
            !doc.removed.includes(e.id) &&
            e.level === level &&
            [e.from, e.to].includes(from) &&
            [e.from, e.to].includes(to) &&
            !doc.structure[e.id],
        ), "Systems require unmodified upper and lower side crossmembers in every bay.");
      }
  return {
    rows,
    ids: nodes.map(([id]) => id),
    width,
    mainDepth: ys[1] - ys[0] - doc.rack.tube,
    rearDepth: rows.length === 3 ? ys[2] - ys[1] - doc.rack.tube : 0,
    depth: ys.at(-1)! - ys[0],
    origin: [(rows[0][0][1].x + rows[0][1][1].x) / 2, ys[0], 0] as [
      number,
      number,
      number,
    ],
  };
}
export function validateSystemParams(
  part: SystemPartId,
  params: unknown,
): NumericParams {
  require(!!params &&
    typeof params === "object" &&
    !Array.isArray(params), "System parameters must be an object.");
  const p = { ...SYSTEM_DEFAULTS[part] };
  for (const [key, value] of Object.entries(params as object)) {
    require(Object.hasOwn(p, key) &&
      typeof value === "number" &&
      Number.isFinite(value), `Invalid ${part} parameter ${key}.`);
    p[key] = value as number;
  }
  for (const key of [
    "loading",
    "upgrade",
    "shroud",
    "adapter",
    "handles",
    "anchored",
    "outside",
  ])
    if (key in p) require([0, 1].includes(p[key]), `${key} must be on or off.`);
  if ("sides" in p)
    require([1, 2, 3].includes(p.sides), "Choose left, right, or dual sides.");
  if (part.includes("ares"))
    require(p.sides === 3 &&
      p.loading === 1, "ARES requires dual selectorized stacks.");
  if (part === "cable-kraken")
    require(p.upgrade === 0, "Kraken uses the 210 lb stack.");
  if (p.loading === 0)
    require(p.upgrade === 0 &&
      p.shroud ===
        0, "Plate-loaded systems cannot use stack upgrades or stack shrouds.");
  if ("trolley" in p)
    require(p.trolley >= 250 &&
      p.trolley <= 3000, "Trolley height must be 250–3000 mm.");
  if (part === "smith-rep") {
    require([-5, 0, 5].includes(
      p.angle,
    ), "Smith install angle must be −5°, 0°, or +5°.");
    require(p.barHeight >= 396 &&
      p.barHeight <= 2029, "Smith bar height is outside its travel.");
    require(p.safetyHeight >= 300 &&
      p.safetyHeight <=
        p.barHeight -
          100, "Smith safeties must remain at least 100 mm below the bar.");
    require(!p.outside || p.angle === 0, "Front Smith currently supports vertical installation only; angled front mounting is not yet verified.");
  }
  return p;
}
export function validateSystems(
  doc: RackDoc,
  input: unknown,
): RackSystem[] | undefined {
  if (input === undefined) return undefined;
  require(Array.isArray(input) &&
    input.length <= 3, "At most three rack systems are supported.");
  const seen = new Set([
    ...Object.keys(doc.uprights),
    ...doc.connections.map((e) => e.id),
    ...doc.accessories.map((a) => a.id),
    ...(doc.floorItems ?? []).map((f) => f.id),
  ]);
  const systems = (input as RackSystem[]).map((s) => {
    require(s &&
      typeof s.id === "string" &&
      /^[a-z][a-z0-9-]{0,79}$/.test(s.id) &&
      !seen.has(s.id), "System IDs must be unique.");
    seen.add(s.id);
    require(isSystemPart(s.part), "Unknown rack system.");
    const params = validateSystemParams(s.part, s.params);
    return { ...structuredClone(s), params };
  });
  if (!systems.length) return systems;
  const layout = systemLayout(doc),
    profile = doc.profileId;
  const cable = systems.filter((s) => s.part !== "smith-rep"),
    smith = systems.filter((s) => s.part === "smith-rep");
  require(smith.length <= 1, "Only one Smith system fits.");
  // Distinct single sides may share a rack, but never occupy the same cable bay.
  let occupied = 0;
  for (const s of cable) {
    const mask = s.params.sides;
    require(!(
      occupied & mask
    ), "Cable systems cannot occupy the same side/bay.");
    occupied |= mask;
  }
  require(new Set(cable.map((s) => s.part)).size <=
    1, "Different cable families cannot share a rack.");
  for (const s of systems) {
    const p = s.params,
      kraken = s.part === "cable-kraken";
    require(kraken
      ? ["bos-hydra", "bos-manticore"].includes(profile ?? "")
      : ["rep-pr-4000", "rep-pr-5000"].includes(
          profile ?? "",
        ), `${SYSTEM_NAMES[s.part]} requires its named manufacturer rack profile.`);
    require((kraken ? [2133.6, 2286, 2743.2] : [2032, 2362.2]).some((h) =>
      close(h, doc.rack.height),
    ), `${SYSTEM_NAMES[s.part]} requires a supported tower/rack height.`);
    require(close(
      doc.rack.tube,
      kraken ? 76.2 : 75,
    ), "Incorrect upright tube for this system.");
    const depths = gridProfile(profile).depths;
    require(depths.some((d) =>
      close(d, layout.mainDepth),
    ), "Unsupported main crossmember depth.");
    if (kraken && layout.rows.length === 3)
      require(layout.mainDepth >=
        761.95, "Six-post Kraken requires 30- or 43-inch front crossmembers; use the four-post adapter for a 24-inch bay.");
    if (layout.rows.length === 3)
      require(close(
        layout.rearDepth,
        kraken ? 609.6 : 406.4,
      ), `Requires a ${kraken ? "24" : "16"}-inch rear bay.`);
    if (s.part.includes("ares") && layout.rows.length === 2) {
      require(profile === "rep-pr-5000" &&
        close(
          layout.mainDepth,
          406.4,
        ), "Four-post ARES requires the documented PR-5000 16-inch configuration.");
      require(p.anchored ===
        1, "Four-post ARES requires floor anchoring. Confirm anchored installation.");
    }
    if (s.part === "cable-athena" && profile === "rep-pr-4000")
      require(layout.rows.length ===
        3, "PR-4000 Athena requires six posts and updated 16-inch crossmembers.");
    if ("trolley" in p) {
      require(p.trolley <= doc.rack.height - 250, "Trolley must clear the top pulley brackets.");
      p.trolley = lockedTrolley({ ...doc.rack, bore:doc.rack.holeDiameter, ...p }, kraken);
    }
    if (s.part === "smith-rep") {
      require(!p.outside || profile === "rep-pr-5000", "Front Smith currently requires PR-5000 with the modeled FFE 2.0 pair.");
      require(!(p.outside && cable.length), "Front Smith cannot share a rack with ARES or Athena: trolley interference.");
      require(!(
        cable.length && layout.rows.length === 2
      ), "Smith and cable systems cannot share a four-post rack.");
      require(!(
        cable.length &&
        profile === "rep-pr-4000" &&
        p.angle !== 0
      ), "PR-4000 with cables only supports a vertical Smith installation.");
      require(p.barHeight <=
        (doc.rack.height < 2200
          ? 1721
          : 2029), "Smith bar exceeds the published upper travel.");
      const internal = doc.accessories.filter(
        (a) =>
          a.part.startsWith("safety-") ||
          (a.part === "spotter-arm" &&
            ["left", "right"].includes(a.target.face)),
      );
      require(p.outside === 1 || !internal.some(
        (a) => a.part === "safety-box" || a.part === "safety-webbing",
      ) &&
        !(
          layout.mainDepth <= 762.05 && internal.length
        ), "Inside Smith mounting conflicts with internal safeties/spotter arms at this depth. Remove the conflicting attachments.");
    }
  }
  return systems;
}
export function systemWarnings(doc: RackDoc): string[] {
  const s = doc.systems ?? [];
  return [
    ...(s.some((x) => x.part === "cable-kraken" && !x.params.anchored)
      ? [
          "Kraken requires floor anchoring or front foot stabilizers. Stabilizer feet are not included in this reconstruction.",
        ]
      : []),
    ...(s.some((x) => x.part === "smith-rep") &&
    s.some((x) => x.part.startsWith("cable-"))
      ? [
          "Smith/cable clearance: park cable trolleys outside the loaded bar travel.",
        ]
      : []),
  ];
}
/** Conservative working bodies exclude intentional post/beam mounting contact. */
export function systemCollisionBoxes(
  part: SystemPartId,
  p: NumericParams,
): LocalBox[] {
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
  ): LocalBox => ({
    min: [x - w / 2, y - d / 2, z - h / 2],
    max: [x + w / 2, y + d / 2, z + h / 2],
  });
  if (part === "smith-rep") {
    return [
      ...smithLayout(p).barCollisionBoxes(),
      ...(p.outside ? [-1, 1].flatMap(s => smithLayout(p).stations.map(station => {
        const length = station.index ? 176.5 : 658.35;
        return box(s * p.rackWidth / 2, -p.tube / 2 - length / 2, station.beamZ, 75, length, 75);
      })) : []),
    ];
  }
  const ares = part.includes("ares"),
    lengthwise = part !== "cable-ares2",
    sides = p.sides === 3 ? [-1, 1] : [p.sides === 1 ? -1 : 1];
  return sides.flatMap((s) => {
    const post = (s * p.rackWidth) / 2,
      stackX = ares ? post - s * 205 : post,
      stackY = ares ? p.depth - (p.rearBay || p.depth) / 2 : p.depth - 210;
    return [
      box(
        stackX,
        stackY,
        620 + (part === "cable-kraken" ? krakenBaseRise(p.height) : 0),
        lengthwise ? 130 : 330,
        lengthwise ? 330 : 130,
        770,
      ),
      box(post, 0, p.trolley, p.tube+20, p.tube+20, 175),
      ...(part === "cable-kraken" ? [post-s*70,post+s*70] : [post+(part === "cable-ares2"?s*75:ares?-s*10:-s*70)]).flatMap(x=>[
        box(x,-p.tube/2-150,p.trolley,46,96,96),
        box(x,-p.tube/2-250,p.trolley+(ares?40:-40)-55,150,20,100),
      ]),
    ];
  });
}
export function resolveSystems(doc: RackDoc): ResolvedInstance[] {
  if (!doc.systems?.length) return [];
  const l = systemLayout(doc),
    r = doc.rack;
  return doc.systems.map((s) => {
    const params = {
      ...s.params,
      height: r.height,
      rackWidth: l.width,
      depth: l.depth,
      rearBay: l.rearDepth ? r.tube + l.rearDepth : 0,
      tube: r.tube,
      bore: r.holeDiameter,
      pitch: r.pitch,
      firstHole: r.firstHole,
      benchSpacing: r.benchSpacing ?? r.pitch, benchStart:r.benchStart ?? 0, benchEnd:r.benchEnd ?? 0,
    };
    const mounts: Mount[] = [];
    const add = (
      id: string,
      face: Face,
      hole: number,
      point: Vec3,
      connectorId?: string,
    ) => {
      const center = point.map((v, i) => v + l.origin[i]) as Vec3;
      mounts.push({
        uprightId: id,
        face,
        hole,
        center,
        position: [...center],
        localAnchor: point,
        pinAxis: [1, 0, 0],
        ...(connectorId ? { connectorId, label: "Crossmember bolt row" } : {}),
      });
    };
    if (s.part === "smith-rep" && s.params.outside) {
      for (const side of [0, 1]) for (const station of smithLayout(params).stations)
        for (const n of [-1, 1]) {
          const z = station.beamZ + n * r.pitch;
          add(l.rows[0][side][0], "front", Math.round((z - r.firstHole) / r.pitch),
            [((side ? 1 : -1) * l.width) / 2, 0, z]);
          mounts.at(-1)!.pinAxis = [0, 1, 0];
        }
    } else if (s.part === "smith-rep") {
      for (const side of [0, 1])
        for (const station of smithLayout(params).stations) {
          const row = l.rows[0][side][0],
            to = l.rows[1][side][0];
          const edge = doc.connections.find(
            (e) =>
              [e.from, e.to].includes(row) &&
              [e.from, e.to].includes(to) &&
              e.level === (station.index ? "upper" : "lower"),
          )!;
          for (const n of [-1, 1]) {
            const y = station.stationY + (n * r.pitch) / 2;
            add(
              row,
              side ? "right" : "left",
              Math.round((y - r.tube / 2 - 62.5) / r.pitch),
              [((side ? 1 : -1) * l.width) / 2, y, station.beamZ],
              edge.id,
            );
          }
        }
    } else
      for (const side of s.params.sides === 3
        ? [0, 1]
        : [s.params.sides === 1 ? 0 : 1])
        for (const row of [l.rows[0], l.rows.at(-1)!])
          for (const z of [r.firstHole + (s.part === "cable-kraken" ? krakenBaseRise(r.height) : 0), cableMountTop(params)])
            for (const n of [0, 2]) {
              const zz = z + n * r.pitch;
              add(
                row[side][0],
                side ? "right" : "left",
                Math.round((zz - r.firstHole) / r.pitch),
                [
                  ((side ? 1 : -1) * l.width) / 2,
                  row[side][1].y - l.origin[1],
                  zz,
                ],
              );
            }
    return {
      id: s.id,
      ownerId: s.id,
      part: s.part,
      kind: "accessory",
      paired: false,
      position: l.origin,
      rotation: [0, 0, 0] as Vec3,
      mount: mounts[0] ?? null,
      mounts,
      connectedTo: l.ids,
      params,
      name: SYSTEM_NAMES[s.part],
      collisionEnabled: true,
      collisionBoxes: systemCollisionBoxes(s.part, params),
    };
  });
}
export function withSystem(
  doc: RackDoc,
  part: SystemPartId,
  params: NumericParams = {},
  id?: string,
): RackDoc {
  const next = structuredClone(doc);
  if (id) {
    const s = next.systems?.find((s) => s.id === id);
    if (!s) throw Error("Unknown system.");
    s.params = { ...s.params, ...params };
  } else {
    let key: string;
    do {
      key = `system-${next.nextId++}`;
    } while (
      [
        ...Object.keys(next.uprights),
        ...next.connections.map((e) => e.id),
        ...next.accessories.map((a) => a.id),
        ...(next.systems ?? []).map((s) => s.id),
        ...(next.floorItems ?? []).map((f) => f.id),
      ].includes(key)
    );
    (next.systems ??= []).push({
      id: key,
      part,
      params: { ...SYSTEM_DEFAULTS[part], ...params },
    });
  }
  return next;
}
