import { smithFrontAdapters } from "./smith-front.ts";
import { smithLayout } from "../system-mounts.ts";
import type { PartDefinition, Vec3 } from "../types.ts";
import { SYSTEM_DEFAULTS, SYSTEM_NOTE } from "../system-types.ts";
import { validateSystemParams } from "../systems.ts";
import { mechanical } from "./system-geometry.ts";
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
        const { lowerBeam, top, at, stations, carriageAt, barAt } = smithLayout(p);
        const tilt = (s: ReturnType<typeof g.box>, x: number, z: number) =>
          g.move(g.rotate(s, [-p.angle, 0, 0]), at(x, z));
        const carriage = (s: ReturnType<typeof g.box>, x: number) =>
          g.move(g.rotate(s, [-p.angle, 0, 0]), carriageAt([x, 0, 0]));
        for (const side of [-1, 1]) {
          const x = side * 529,
            postX = (side * p.rackWidth) / 2;
          g.add(
            "Polished Smith guide rod",
            g.rod(at(x, lowerBeam + p.tube / 2 + 10), at(x, top), 15),
            "rod"
          );
          for (const { index, beamZ, guideZ, guideY, stationY } of stations) {
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
            g.add(
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
            g.add(
              "Guide rod split clamp",
              tilt(g.ring(35, 27, 15.1, "z", [0, 0, 0]), x, guideZ)
            );
            g.bolt("Guide clamp locking bolt", at(x, guideZ), 8, 68, "y");
          }
          // Catch ladder and hooks travel on the same installed-angle reference.
          g.add(
            "Smith catch ladder",
            tilt(
              g.box([30, 30, max - 275], [0, 0, (max - 275) / 2]),
              x + side * 53,
              330
            )
          );
          for (let i = 0; i < count; i++) {
            const z = 396 + (i * (max - 396)) / (count - 1),
              q = at(x + side * 53, z);
            g.add(
              `Racking post ${i + 1} of ${count}`,
              g.cylinder(72, 10, "x", q),
              "rod"
            );
            g.add(
              `Racking post end cap ${i + 1}`,
              g.cylinder(5, 14, "x", [q[0] - side * 38, q[1], q[2]]),
              "source"
            );
          }
          for (const dz of [-52, 52]) {
            g.add(
              "Smith linear bearing housing",
              carriage(g.ring(60, 31, 15.2, "z", [0, 0, dz]), x)
            );
            g.add(
              "Linear bearing dust seal",
              carriage(g.ring(5, 30, 15, "z", [0, 0, dz + 32]), x),
              "liner"
            );
          }
          g.add(
            "Carriage side plate",
            carriage(
              g.cut(g.box([8, 150, 180], [side * 37, -30, 0]), [
                g.cylinder(12, 18, "x", [side * 37, -60, 0]),
              ]),
              x
            )
          );
          const hook = [
            [-15, -28],
            [52, -28],
            [70, -10],
            [70, 24],
            [52, 24],
            [52, -4],
            [10, -4],
            [10, 35],
            [-15, 35],
          ] as [number, number][];
          g.add(
            "Rotating bar locking hook",
            carriage(g.profile(hook, 10, [side * 35, -60, 0], "x"), x)
          );
          g.add(
            "Composite hook contact liner",
            carriage(g.box([12, 33, 5], [side * 40, -30, -1]), x),
            "liner"
          );
          g.add(
            "Bar rotation lever",
            g.path(
              [
                carriageAt([x, 0, 0]),
                carriageAt([x - side * 30, 0, 75]),
                carriageAt([x - side * 100, 0, 75]),
              ],
              9
            ),
            "handle"
          );
          g.add(
            "Low-profile Smith safety stop",
            tilt(g.ring(55, 38, 15.3, "z", [0, 0, 0]), x, p.safetyHeight)
          );
          g.add(
            "Safety stop impact pad",
            tilt(g.ring(18, 39, 15.2, "z", [0, 0, 0]), x, p.safetyHeight + 36),
            "liner"
          );
          g.bolt("Safety locking pin", at(x, p.safetyHeight), 12, 100, "y");
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
