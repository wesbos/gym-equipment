import { test } from "node:test";
import assert from "node:assert/strict";
import Module from "manifold-3d";
import { definitions } from "./parts/cable-systems.ts";
import { cableRoutePlan } from "./parts/cable-routes.ts";
import {
  lockedTrolley,
  trolleyStations,
  krakenBaseRise,
} from "./cable-stations.ts";
import { applyPreset, RACK_PRESETS } from "./presets.ts";
import { validateAssembly, resolveAssembly } from "./assembly.ts";
import { withSystem, systemCollisionBoxes } from "./systems.ts";
import type { NumericParams, SolidPart } from "./types.ts";
const ready = Module().then((api) => {
  api.setup();
  return api;
});
const intersects = (a: SolidPart, b: SolidPart) => {
  const x = a.solid.boundingBox(),
    y = b.solid.boundingBox();
  return x.min.every((v, i) => v < y.max[i] && x.max[i] > y.min[i]);
};
function clear(a: SolidPart, b: SolidPart) {
  if (!intersects(a, b)) return;
  const cut = a.solid.intersect(b.solid);
  try {
    assert.ok(
      cut.volume() < 0.05,
      `${a.name} penetrates ${b.name}: ${cut.volume()} mm³`,
    );
  } finally {
    cut.delete();
  }
}
const cableParts = (parts: SolidPart[]) =>
  parts.filter((p) =>
    /continuous|functional\/|floating-to-trolley/.test(p.name),
  );
for (const def of definitions)
  test(`${def.id}: cable cores, hubs, cheeks, adjacent circuits and selector stations clear`, async () => {
    const api = await ready,
      parts = def.build(api, def.defaults);
    try {
      const cables = cableParts(parts),
        wheels = parts.filter((p) =>
          /wheel|cheek|axle|hanger web|mounting deck|Polished stack guide rod|Trolley.*bridge|Trolley output pivot|ARES transverse stack support/.test(
            p.name,
          ),
        );
      for (const cable of cables)
        for (const wheel of wheels) clear(cable, wheel);
      for (let i = 0; i < cables.length; i++)
        for (let j = i + 1; j < cables.length; j++) clear(cables[i], cables[j]);
      for (const plate of parts.filter((p) =>
        /Drilled guide support plate|ARES transverse stack support/.test(
          p.name,
        ),
      ))
        for (const cable of cables) clear(cable, plate);
      for (const plate of parts.filter((p) =>
        /Drilled guide support plate|ARES transverse stack support/.test(
          p.name,
        ),
      ))
        for (const wheel of parts.filter((p) =>
          p.name.includes("grooved six-spoke wheel"),
        ))
          clear(wheel, plate);
      for (const head of parts.filter((p) => p.name === "Stack headplate"))
        for (const wheel of parts.filter(
          (p) => p.name === "Moving stack pulley grooved six-spoke wheel",
        ))
          clear(head, wheel);
      for (const pin of parts.filter((p) => p.name === "Selector pin"))
        for (const plate of parts.filter(
          (p) =>
            p.name.startsWith("Weight stack plate") ||
            p.name.startsWith("Selector stem with"),
        ))
          clear(pin, plate);
      for (const head of parts.filter((p) => p.name === "Stack headplate"))
        assert.ok(
          parts
            .filter((p) => p.name === "Raised stack sheave clevis")
            .some((c) => {
              if (!intersects(head, c)) return false;
              const cut = head.solid.intersect(c.solid);
              try {
                return cut.volume() > 1;
              } finally {
                cut.delete();
              }
            }),
          "Raised fork must meet headplate",
        );
    } finally {
      parts.forEach((p) => p.solid.delete());
    }
  });

test("family topology has modeled ends and visits every sheave at low/default/high locked positions", () => {
  for (const def of definitions)
    for (const height of def.id === "cable-kraken"
      ? [2133.6, 2286, 2743.2]
      : [2032, 2362.2])
      for (const depth of def.id === "cable-kraken"
        ? [685.8, 838.2, 1168.4]
        : [481.4, 1318.4])
        for (const target of [250, 1000, height - 250]) {
          const rise = def.id === "cable-kraken" ? krakenBaseRise(height) : 0;
          const world = { ...def.defaults, height, depth, trolley: target };
          const p: NumericParams = {
            ...world,
            height: height - rise,
            trolley: lockedTrolley(world, def.id === "cable-kraken") - rise,
          };
          const side = -1,
            post = -p.rackWidth / 2,
            ares = def.id.includes("ares"),
            sx = ares ? post + 205 : post,
            sy = ares ? depth - (p.rearBay || depth) / 2 : depth - 210;
          const count =
            def.id === "cable-kraken"
              ? 20
              : def.id === "cable-athena"
                ? 15
                : 25;
          const movingZ = 165 + count * (ares ? 23.5 : 25.5) + 70;
          const plan = cableRoutePlan(
            p,
            def.id as Parameters<typeof cableRoutePlan>[1],
            side,
            sx,
            sy,
            movingZ,
          );
          for (const wheel of plan.pulleys)
            assert.ok(plan.cables.some((c) => c.pulleys.includes(wheel.id)));
          for (const cable of plan.cables) {
            assert.ok(cable.start && cable.end);
            assert.ok(cable.points.flat().every(Number.isFinite));
          }
          if (def.id === "cable-kraken") {
            assert.equal(plan.cables.length, 2);
            assert.equal(plan.cables[0].start, "Output handle 1");
            assert.equal(plan.cables[0].end, "Output handle 2");
            assert.equal(
              plan.pulleys.filter((p) => p.id === "Floating equalizer").length,
              1,
            );
          }
          if (def.id === "cable-athena") assert.equal(plan.cables.length, 1);
          if (ares)
            for (const name of ["upper 1", "upper 2", "lower 1", "lower 2"])
              assert.ok(
                plan.pulleys.some((p) => p.id === `Floating equalizer ${name}`),
              );
        }
});

test("locking pins snap to each actual front-face lattice, including PR4000 half stations", () => {
  for (const profile of [
    "rep-pr-4000",
    "rep-pr-5000",
    "bos-hydra",
    "bos-manticore",
  ]) {
    const d = applyPreset(
      RACK_PRESETS.find(
        (p) => p.profileId === profile && p.kind === "six" && p.depth === 762,
      )!.id,
    );
    const part = profile.startsWith("bos") ? "cable-kraken" : "cable-athena";
    for (const requested of [250, 1000, d.rack.height - 250]) {
      const built = validateAssembly(
        withSystem(d, part, { trolley: requested }),
      );
      const p = { ...d.rack, bore: d.rack.holeDiameter, trolley: requested };
      assert.ok(
        trolleyStations(p, part === "cable-kraken").includes(
          built.systems![0].params.trolley,
        ),
      );
    }
    if (profile === "rep-pr-4000")
      assert.ok(
        trolleyStations({ ...d.rack, bore: d.rack.holeDiameter }).some(
          (z) => Math.abs(z - (d.rack.firstHole + 8.5 * d.rack.pitch)) < 1e-6,
        ),
      );
  }
});

test("108-inch Kraken raises lower supports and the 90-inch kit together on nine rack stations", async () => {
  const d = applyPreset(
    RACK_PRESETS.find(
      (p) =>
        p.profileId === "bos-manticore" &&
        p.kind === "six" &&
        p.height === 2743.2 &&
        p.depth === 762,
    )!.id,
  );
  const before = resolveAssembly(d),
    built = validateAssembly(withSystem(d, "cable-kraken")),
    after = resolveAssembly(built);
  for (const e of built.connections.filter(
    (e) =>
      e.level === "lower" &&
      built.uprights[e.from].x === built.uprights[e.to].x,
  ))
    assert.ok(
      Math.abs(
        after.find((r) => r.id === e.id)!.position[2] -
          before.find((r) => r.id === e.id)!.position[2] -
          457.2,
      ) < 1e-5,
    );
  const system = after.find((r) => r.part === "cable-kraken")!;
  assert.ok(
    system.mounts.every((m) => m.center[2] >= d.rack.firstHole + 457.2),
  );
  const api = await ready,
    def = definitions[0],
    parts = def.build(api, { ...def.defaults, ...system.params });
  try {
    assert.ok(parts.every((p) => p.solid.status() === "NoError"));
    const base = parts
      .find((p) => p.name === "Drilled guide support plate")!
      .solid.boundingBox();
    assert.ok(Math.abs(base.min[2] - (110 + 457.2)) < 0.01);
  } finally {
    parts.forEach((p) => p.solid.delete());
  }
});

test("single-side Kraken and combiner retain one continuous long cable and a separate short cable", async () => {
  const api = await ready,
    def = definitions[0];
  for (const sides of [1, 2, 3]) {
    const parts = def.build(api, {
      ...def.defaults,
      sides,
      adapter: 1,
      loading: 0,
    });
    try {
      const cables = cableParts(parts);
      assert.equal(cables.length, sides === 3 ? 4 : 2);
      assert.equal(
        parts.filter((p) => p.name === "1:1 dual-output combiner").length,
        sides === 3 ? 2 : 1,
      );
      for (let i = 0; i < cables.length; i++)
        for (let j = i + 1; j < cables.length; j++) clear(cables[i], cables[j]);
    } finally {
      parts.forEach((p) => p.solid.delete());
    }
  }
});

test("locked trolley pin clears the actual perforated upright at low, default and high stations", async () => {
  const api = await ready;
  const { definitions: frames } = await import("./parts/structure.ts");
  for (const profile of [
    "rep-pr-4000",
    "rep-pr-5000",
    "bos-hydra",
    "bos-manticore",
  ]) {
    const d = applyPreset(
      RACK_PRESETS.find(
        (p) => p.profileId === profile && p.kind === "six" && p.depth === 762,
      )!.id,
    );
    const id = profile.startsWith("bos") ? "cable-kraken" : "cable-athena";
    const doc = validateAssembly(withSystem(d, id)),
      resolved = resolveAssembly(doc),
      system = resolved.find((r) => r.part === id)!;
    const upright = resolved.find((r) => r.id === "front-left")!,
      frame = frames.find((d) => d.id === "upright")!;
    const steel = frame.build(api, { ...frame.defaults, ...upright.params });
    const def = definitions.find((d) => d.id === id)!,
      parts = def.build(api, { ...def.defaults, ...system.params });
    const pin = parts.find((p) => p.name === "Trolley locking pin")!;
    const transformed = steel.map((p) => ({
      ...p,
      solid: p.solid.translate(upright.position),
    }));
    try {
      for (const requested of [
        250,
        1000,
        d.rack.height - 250,
        ...(profile === "rep-pr-4000"
          ? [d.rack.firstHole + 8.5 * d.rack.pitch]
          : []),
      ]) {
        const z = lockedTrolley(
          { ...d.rack, bore: d.rack.holeDiameter, trolley: requested },
          id === "cable-kraken",
        );
        const moved = {
          ...pin,
          solid: pin.solid.translate([0, 0, z - system.params.trolley]),
        };
        try {
          for (const body of transformed) clear(moved, body);
        } finally {
          moved.solid.delete();
        }
      }
    } finally {
      [...steel, ...transformed, ...parts].forEach((p) => p.solid.delete());
    }
  }
});

for (const def of definitions)
  test(`${def.id}: low/high locked positions keep cables outside every sheave`, async () => {
    const api = await ready;
    for (const trolley of [250, def.defaults.height - 250]) {
      const parts = def.build(api, { ...def.defaults, trolley });
      try {
        for (const c of cableParts(parts))
          for (const w of parts.filter((p) =>
            /wheel|cheek|axle|hanger web|mounting deck|Polished stack guide rod|Trolley.*bridge|Trolley output pivot|ARES transverse stack support/.test(
              p.name,
            ),
          ))
            clear(c, w);
      } finally {
        parts.forEach((p) => p.solid.delete());
      }
    }
  });

test("ARES2 REP pp58/66 fixture: upper adjuster ascends, working output feeds from front foot, twin centered row outputs", () => {
  const def = definitions.find((d) => d.id === "cable-ares2")!;
  for (const height of [2032, 2362.2])
    for (const depth of [481.4, 1318.4])
      for (const target of [250, height - 250]) {
        const p: NumericParams = { ...def.defaults, height, depth, trolley: target };
        p.trolley = lockedTrolley(p);
        const plans = [-1, 1].map((side) => cableRoutePlan(p, "cable-ares2", side,
          side * (p.rackWidth / 2 - 205), depth - p.rearBay / 2, 822.5));
        for (const [index, plan] of plans.entries()) {
          const side = index === 0 ? -1 : 1;
          const upper = plan.routes[0], lower = plan.routes[1];
          assert.equal(upper.start, "Trolley upper cable anchor");
          assert.ok(upper.points[1].point[2] > upper.points[0].point[2]);
          assert.equal(lower.start, "Output handle 1");
          const foot = lower.points.find((p) => p.pulley === "Lower front return")!.point;
          assert.equal(foot[1], 0, "feed belongs to front upright, independent of rear stack bay");
          assert.ok(foot[2] < 200);
          assert.ok(side * foot[0] > p.rackWidth / 2 + p.tube / 2);
          const swivel = plan.pulleys.find((p) => p.id === "Swivel cable output 1")!;
          assert.ok(swivel.center[2] > lower.points[0].point[2]);
          const entry = lower.points.filter((p) => p.pulley === "Swivel cable output 1");
          assert.equal(entry.length, 2, "paired quarter-turns form the upper reversal");
          assert.equal(entry[1].point[1], foot[1], "straight rising foot feed");
          const row = plan.pulleys.find((p) => p.id === "Low row swivel")!;
          assert.ok(Math.abs(row.center[0]) < 120 && row.center[2] > 350);
          assert.equal(lower.end, "Low row output eye");
          assert.equal(upper.end, "Lat output eye");
          const overStack = upper.points.find((p) => p.pulley === "Upper rear redirect 2")!.point;
          assert.ok(overStack[2] > height - 30, "rear path crosses above the header, not below it");
        }
        const left = plans[0].pulleys.find((p) => p.id === "Low row swivel")!;
        const right = plans[1].pulleys.find((p) => p.id === "Low row swivel")!;
        assert.equal(left.center[0], -right.center[0]);
        assert.equal(left.center[2], right.center[2]);
      }
});

test("ARES2 source/mesh fixture: transverse plates, paired supported swivels, cable and axle clearance at both extremes", async () => {
  const api = await ready;
  const { printableMesh } = await import("../src/exports/print-mesh.ts");
  const def = definitions.find((d) => d.id === "cable-ares2")!;
  for (const trolley of [250, def.defaults.height - 250]) {
    const params = { ...def.defaults, trolley: lockedTrolley({ ...def.defaults, trolley }) };
    const parts = def.build(api, params);
    try {
      assert.ok(parts.every((p) => p.solid.boundingBox().min[2] >= 0), "all ARES2 source hardware stays above the floor");
      const boxes = systemCollisionBoxes("cable-ares2", params);
      for (const part of parts.filter((p) =>
        /^(Sliding trolley steel sleeve|Swivel cable output 1|Trolley output pivot|Output handle 1)/.test(p.name),
      )) {
        const bounds = part.solid.boundingBox();
        assert.ok(boxes.some((box) => bounds.min.every((v, k) =>
          v >= box.min[k] - 0.01 && bounds.max[k] <= box.max[k] + 0.01)),
          `${part.name} extends outside its collision envelope`);
      }
      assert.ok(parts.every((p) => p.solid.status() === "NoError" && p.solid.volume() > 0));
      const plate = parts.find((p) => p.name === "Weight stack plate 1")!.solid.boundingBox();
      assert.ok(plate.max[0] - plate.min[0] > 2 * (plate.max[1] - plate.min[1]));
      const additions = parts.filter((p) => /lower keeper|paired swivel|swivel pivot|swivel pedestal|pedestal base|header end bracket|coaxial equalizer|Folded perforated pulley rail/i.test(p.name));
      assert.equal(parts.filter((p) => /lower keeper grooved/.test(p.name)).length, 4);
      assert.equal(parts.filter((p) => p.name === "Low row vertical swivel pivot").length, 2);
      for (const part of additions) {
        printableMesh(part.solid, part.name);
        for (const cable of cableParts(parts)) clear(cable, part);
      }
      assert.equal(parts.filter((p) => p.name === "ARES2 coaxial equalizer shared axle").length, 4);
      assert.equal(parts.filter((p) => /^Floating equalizer.*(cheek|axle)/.test(p.name)).length, 0);
      for (const axle of parts.filter((p) => p.name === "ARES2 coaxial equalizer shared axle")) {
        const a = axle.solid.boundingBox();
        const pair = parts.filter((p) => /^Floating equalizer.*grooved six-spoke wheel$/.test(p.name)).filter((p) => {
          const b = p.solid.boundingBox();
          return [1, 2].every((i) => Math.abs(a.min[i] + a.max[i] - b.min[i] - b.max[i]) < 0.01)
            && b.min[0] > a.min[0] && b.max[0] < a.max[0];
        });
        assert.equal(pair.length, 2, "one physical axle spans both coaxial equalizer wheels");
      }
      const wheels = parts.filter((p) => p.name.endsWith("grooved six-spoke wheel"));
      for (let i = 0; i < wheels.length; i++)
        for (let j = i + 1; j < wheels.length; j++) clear(wheels[i], wheels[j]);
      for (const fixed of parts.filter((p) => /^(Lower rear redirect 1|Lower row approach).*wheel|^(Lower rear redirect 1|Lower row approach).*cheek/.test(p.name)))
        for (const support of parts.filter((p) => /Drilled guide support plate|ARES transverse stack support/.test(p.name)))
          clear(fixed, support);
      for (const strap of parts.filter((p) => p.name.endsWith("paired swivel cheek strap")))
        for (const axle of parts.filter((p) => /axle/.test(p.name))) clear(strap, axle);
      for (const bracket of parts.filter((p) => p.name === "ARES2 lower header end bracket"))
        for (const target of ["ARES transverse stack support", "Folded perforated pulley rail"])
          assert.ok(parts.filter((p) => p.name === target).some((p) => {
            const overlap = bracket.solid.intersect(p.solid);
            try { return overlap.volume() > 1; } finally { overlap.delete(); }
          }), `raised lower header bracket must meet ${target}`);
      for (const bearing of parts.filter((p) => p.name.endsWith("swivel pivot bearing"))) {
        assert.ok(parts.filter((p) => p.name.endsWith("swivel pivot arm")).some((arm) => {
          if (!intersects(arm, bearing)) return false;
          const overlap = arm.solid.intersect(bearing.solid);
          try { return overlap.volume() > 1; } finally { overlap.delete(); }
        }), "pivot bearing must meet the swivel arms");
      }
      for (const pedestal of parts.filter((p) => p.name === "Low row swivel pedestal"))
        assert.ok(parts.filter((p) => p.name === "Low row pedestal base").some((base) => {
          const overlap = pedestal.solid.intersect(base.solid);
          try { return overlap.volume() > 1; } finally { overlap.delete(); }
        }), "raised row pivot pedestal must meet its base");
    } finally { parts.forEach((p) => p.solid.delete()); }
  }
});

test("ARES2 RevK pp59/63/67 equalizer fixture: coaxial pairs, same-handed wraps, one fixed reversal and horizontal corners", () => {
  const def = definitions.find((d) => d.id === "cable-ares2")!;
  for (const height of [2032, 2362.2])
    for (const depth of [481.4, 1318.4])
      for (const side of [-1, 1]) {
        const p = { ...def.defaults, height, depth };
        const plan = cableRoutePlan(p, "cable-ares2", side,
          side * (def.defaults.rackWidth / 2 - 205), depth - def.defaults.rearBay / 2, 822.5);
        assert.ok(Math.abs(plan.pulleys.find((w) => w.id === "Lower row horizontal redirect")!.normal[2]) > 0.9999,
          "H turns the lower return lane in the horizontal plane");
        for (const level of ["upper", "lower"]) {
          const pair = [1, 2].map((n) => plan.pulleys.find((w) => w.id === `Floating equalizer ${level} ${n}`)!);
          assert.equal(pair[0].center[1], pair[1].center[1]);
          assert.equal(pair[0].center[2], pair[1].center[2]);
          assert.ok(Math.abs(pair[0].center[0] - pair[1].center[0]) < 50,
            "two adjacent grooves, not two separated floating frames");
          assert.ok(pair[0].normal.every((v, i) => Math.abs(v - pair[1].normal[i]) < 1e-6),
            "inside and outside wraps must have the same handedness");
          const prefix = level === "upper" ? "Upper" : "Lower";
          const transfer = plan.pulleys.filter((w) => w.id.startsWith(`${prefix} equalizer transfer`));
          assert.equal(transfer.length, 1, "REP E is one fixed reversal");
          assert.ok(Math.abs(transfer[0].normal[2]) < 1e-6, "E is an upright sheave, not a horizontal turn");
          const corner = plan.pulleys.find((w) => w.id === `${prefix} rear horizontal redirect`)!;
          assert.ok(Math.abs(corner.normal[2]) > 0.9999, "C explicitly turns the horizontal cable lane");
        }
      }
});
