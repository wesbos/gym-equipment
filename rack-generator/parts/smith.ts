import { smithFrontAdapters } from "./smith-front.ts";
import { smithLayout } from "../system-mounts.ts";
import type { PartDefinition, Vec2 } from "../types.ts";
import { SYSTEM_DEFAULTS, SYSTEM_NOTE } from "../system-types.ts";
import { validateSystemParams } from "../systems.ts";
import { mechanical } from "./system-geometry.ts";
/** Guide axis from the side centre: bar collars (±630) sit just outboard of the
 * carriage flange bearing, as in REP studio/lifestyle photos (reference/photos/smith-rep). */
export const SMITH_GUIDE_X = 575;
/** Ladder side plates, hook plane and rung centre, measured inboard of the guide axis. */
export const SMITH_LADDER = { outer: 40, inner: 95, hook: 55, rungY: 20, plateY: [-10, 85] } as const;
// Hook plate outline in carriage-local (y, z); bar axis at (-60, 0). Photo-traced
// estimate: collar lobe, rearward-leaning shank and an overhanging catch beak.
const HOOK: Vec2[] = [[-86, 0], [-72, -26], [-48, -26], [-34, 0], [-20, 60], [-4, 106],
  [-2, 140], [-18, 158], [-48, 158], [-60, 128], [-66, 70]];
// Triangular gusset carrying the bar flange bearing forward of the bearing tube (REP overview CAD).
// Forward extent stops at local y -86 so the 0° inside layout (guides 125.4 mm behind the
// front-post centre) keeps the carriage clear of the post's rear face.
const GUSSET: Vec2[] = [[-50, 62], [-86, 34], [-86, -34], [-50, -62], [-14, -88], [-14, 88]];
export const definitions: PartDefinition[] = [
  {
    id: "smith-rep",
    name: "REP Smith Machine",
    category: "Smith systems",
    description: SYSTEM_NOTE,
    defaults: {
      ...SYSTEM_DEFAULTS["smith-rep"],
      height: 2032,
      rackWidth: 1215.32,
      depth: 837,
      rearBay: 0,
      tube: 75,
      bore: 25.4,
      pitch: 50.8,
      firstHole: 65,
    },
    build: (api, p) => {
      validateSystemParams(
        "smith-rep",
        Object.fromEntries(
          Object.keys(SYSTEM_DEFAULTS["smith-rep"]).map((k) => [k, p[k]])
        )
      );
      if (
        ![2032, 2362.2].includes(p.height) ||
        p.barHeight > (p.height === 2032 ? 1721 : 2029)
      )
        throw Error("Invalid Smith height/travel.");
      return mechanical(api, (g) => {
        if (p.outside) smithFrontAdapters(g, p);
        const count = p.height === 2032 ? 16 : 19,
          max = p.height === 2032 ? 1721 : 2029;
        const { lowerBeam, upperBeam, top, at, stations, carriageAt, barAt } = smithLayout(p);
        type S = ReturnType<typeof g.box>;
        const tilt = (s: S, x: number, z: number) =>
          g.move(g.rotate(s, [-p.angle, 0, 0]), at(x, z));
        const carriage = (s: S, x: number) =>
          g.move(g.rotate(s, [-p.angle, 0, 0]), carriageAt([x, 0, 0]));
        // The Smith upright, carriage, hooks and stops ship metallic black only; they do not follow rack paint.
        const black = (name: string, s: S) => {
          g.add(name, s, "source");
          Object.assign(g.parts[g.parts.length - 1], { color: "#353739", metalness: 0.3, roughness: 0.48 });
        };
        const { outer, inner, hook, rungY, plateY } = SMITH_LADDER;
        const plateD = plateY[1] - plateY[0],
          plateC = (plateY[0] + plateY[1]) / 2;
        const ladderLow = lowerBeam + 53.5,
          ladderHigh = upperBeam - 53.5,
          ladderH = ladderHigh - ladderLow;
        for (const side of [-1, 1]) {
          const x = side * SMITH_GUIDE_X,
            postX = (side * p.rackWidth) / 2;
          g.add(
            "Polished Smith guide rod",
            g.rod(at(x, lowerBeam + p.tube / 2 + 10), at(x, top), 15),
            "rod"
          );
          for (const { index, beamZ, guideY, stationY } of stations) {
            const faceX = postX - side * (p.tube / 2 + 3);
            const web = g.box([6, p.pitch + 40, 80], [faceX, stationY, beamZ]);
            const holes = [-1, 1].map((n) =>
              g.cylinder(10, p.bore / 2, "x", [
                faceX,
                stationY + (n * p.pitch) / 2,
                beamZ,
              ])
            );
            const deckZ = beamZ + (index ? -1 : 1) * (p.tube / 2 + 4);
            const deck = g.box(
              [Math.abs(postX - x) + p.tube / 2, p.pitch + 40, 8],
              [(postX + x) / 2, stationY, deckZ]
            );
            // A bored deck and paired oval windows reproduce the two-piece L-bracket.
            const deckHole = g.cylinder(12, 18, "z", [x, guideY, deckZ]);
            black(
              "Smith crossmember L-bracket",
              g.union([g.cut(web, holes), g.cut(deck, [deckHole])])
            );
            for (const n of [-1, 1])
              g.bolt(
                "Smith crossmember through-bolt",
                [postX, stationY + (n * p.pitch) / 2, beamZ],
                p.bore - 0.8,
                p.tube + 40
              );
            // Welded upright end plate ties guide collar and both ladder plates (Rev B parts page 2).
            const endZ = beamZ + (index ? -1 : 1) * 49.5,
              clampZ = beamZ + (index ? -1 : 1) * 67.5;
            black(
              "Smith upright end plate",
              tilt(
                g.cut(g.box([150, 125, 8], [-side * 30, 30, 0]), [
                  g.cylinder(10, 15.5, "z", [0, 0, 0]),
                ]),
                x,
                endZ
              )
            );
            for (const n of [-1, 1]) {
              const q = at(x + side * 25, endZ);
              g.bolt("Upright end plate M8 bolt", [q[0], q[1] + n * 30, q[2]], 8, 22, "z");
            }
            black(
              "Guide rod split clamp",
              tilt(g.ring(28, 30, 15.1, "z", [0, 0, 0]), x, clampZ)
            );
            g.bolt("Guide clamp locking bolt", at(x + side * 22, clampZ), 8, 50, "y");
          }
          // Catch ladder: two drilled side plates with chrome rungs; the hook enters between them.
          for (const [n, dx] of [[1, outer], [2, inner]] as const) {
            const slots = [];
            for (let dz = 30; dz < ladderH - 30; dz += 44.45)
              slots.push(g.box([10, 9, 9], [0, 62, dz - ladderH / 2]));
            black(
              `Smith catch ladder plate ${n}`,
              tilt(
                g.cut(g.box([6, plateD, ladderH], [0, plateC, 0]), slots),
                x - side * dx,
                ladderLow + ladderH / 2
              )
            );
          }
          const rungX = x - (side * (outer + inner)) / 2;
          // Rear web closes the channel, so the rungs read against black as in the studio elevation.
          black(
            "Smith catch ladder back web",
            tilt(g.box([inner - outer - 6, 4, ladderH], [0, plateY[1] - 2, 0]), rungX, ladderLow + ladderH / 2)
          );
          for (let i = 0; i < count; i++) {
            const z = 396 + (i * (max - 396)) / (count - 1);
            g.add(
              `Racking post ${i + 1} of ${count}`,
              tilt(g.cylinder(inner - outer, 10, "x", [0, rungY, 0]), rungX, z),
              "rod"
            );
            g.add(
              `Racking post end cap ${i + 1}`,
              g.union(
                [inner + 5, outer - 5].map((dx) =>
                  tilt(g.cylinder(4, 13, "x", [0, rungY, 0]), x - side * dx, z)
                )
              ),
              "fastener"
            );
          }
          // Carriage: enclosed linear-bearing tube, two gussets and an outboard bar flange bearing.
          black(
            "Smith linear bearing housing",
            carriage(g.ring(174, 32, 15.2, "z", [0, 0, -2]), x)
          );
          for (const z of [-92, 88])
            g.add(
              "Linear bearing dust seal",
              carriage(g.ring(6, 30, 15.2, "z", [0, 0, z]), x),
              "liner"
            );
          const gusset = (sx: number) =>
            g.cut(g.profile(GUSSET, 8, [sx * 37 - 4, 0, 0], "x"), [
              g.cylinder(12, 18, "x", [sx * 37, -60, 0]),
            ]);
          black("Carriage side plate", carriage(gusset(side), x));
          black("Carriage inner gusset", carriage(gusset(-side), x));
          black(
            "Carriage bar flange bearing",
            carriage(
              g.cut(
                g.union([
                  g.cylinder(12, 27, "x", [side * 47, -60, 0]),
                  g.box([12, 22, 104], [side * 47, -60, 0]),
                ]),
                [g.cylinder(14, 18, "x", [side * 47, -60, 0])]
              ),
              x
            )
          );
          for (const z of [-40, 40])
            g.add(
              "Flange bearing bolt",
              carriage(g.cylinder(20, 5, "x", [side * 47, -60, z], 6), x),
              "fastener"
            );
          // Hook: bare brushed-steel plate welded to a bar collar (so it shares the polished bar finish),
          // backed inboard by a composite liner 2 mm proud of the steel outline (hook-closeup-branding.jpg).
          const hx = -side * hook;
          g.add(
            "Rotating bar locking hook",
            carriage(
              g.union([
                g.cut(g.profile(HOOK, 10, [hx - 5, 0, 0], "x"), [
                  g.cylinder(14, 11, "x", [hx, -8, 112]),
                  g.rounded(14, 12, 44, [hx, -38, 72], 5),
                ]),
                g.ring(20, 27, 17.6, "x", [hx, -60, 0]),
              ]),
              x
            ),
            "sleeve"
          );
          const lx = hx - 2 - side * 7,
            linerLoop = g.keep(g.keep(new g.api.CrossSection([HOOK])).offset(2, "Round", 2, 16)).toPolygons()[0] as Vec2[];
          g.add(
            "Composite hook contact liner",
            carriage(
              g.cut(g.profile(linerLoop, 4, [lx, 0, 0], "x"), [
                g.cylinder(12, 9, "x", [lx + 2, -8, 112]),
                g.cylinder(12, 18, "x", [lx + 2, -60, 0]),
              ]),
              x
            ),
            "liner"
          );
          // Safety: ribbed clamp collar with a C-tab wrapping the ladder plate edge, composite bumper on top.
          const tab = g.cut(
            g.box([22, 48, 26], [-side * 39, -16, -25]),
            [g.box([8, 40, 30], [-side * 40, 9, -25])]
          );
          const clamp = g.cut(g.cylinder(40, 34, "z", [0, 0, -20]), [
            g.cylinder(42, 15.3, "z", [0, 0, -20]),
            ...[0, 1, 2, 3].map((k) => g.ring(3, 36, 32, "z", [0, 0, -34 + k * 8])),
          ]);
          black(
            "Low-profile Smith safety stop",
            tilt(g.union([clamp, g.cut(tab, [g.cylinder(42, 15.3, "z", [0, 0, -20])])]), x, p.safetyHeight)
          );
          g.add(
            "Safety stop impact pad",
            tilt(g.ring(45, 30, 15.2, "z", [0, 0, 22.5]), x, p.safetyHeight),
            "liner"
          );
          const pin = at(x - side * 39, p.safetyHeight - 25);
          g.bolt("Safety locking pin", [pin[0], pin[1] - 32, pin[2]], 8, 28, "x");
        }
        const b = barAt(0);
        g.add(
          "Polished 35 mm Smith bar shaft",
          g.ring(1280, 17.5, 11, "x", b),
          "rod"
        );
        for (const side of [-1, 1]) {
          g.add(
            "289.5 mm loadable Olympic sleeve",
            g.ring(289.5, 25, 18, "x", [side * (940 - 289.5 / 2), b[1], b[2]]),
            "sleeve"
          );
          g.add(
            "Sleeve shoulder collar",
            g.ring(20, 40, 17.6, "x", [side * 640, b[1], b[2]]),
            "sleeve"
          );
          g.add(
            "Sleeve end cap",
            g.cylinder(5, 24, "x", [side * 937.5, b[1], b[2]]),
            "source"
          );
          for (const x of [405, 455])
            g.add(
              "IWF/IPF grip ring",
              g.ring(3, 17.65, 17.4, "x", [side * x, b[1], b[2]]),
              "source"
            );
        }
      });
    },
  },
];
