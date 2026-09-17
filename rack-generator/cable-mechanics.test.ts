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
import { withSystem } from "./systems.ts";
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
          /wheel|cheek|axle|hanger web|mounting deck|Polished stack guide rod|Trolley.*bridge|ARES transverse stack support/.test(
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
            /wheel|cheek|axle|hanger web|mounting deck|Polished stack guide rod|Trolley.*bridge|ARES transverse stack support/.test(
              p.name,
            ),
          ))
            clear(c, w);
      } finally {
        parts.forEach((p) => p.solid.delete());
      }
    }
  });
