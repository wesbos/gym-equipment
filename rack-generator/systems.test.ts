import { test } from "node:test";
import type { NumericParams } from "./types.ts";
import assert from "node:assert/strict";
import Module from "manifold-3d";
import {
  createAssembly,
  validateAssembly,
  resolveAssembly,
  removeInstance,
} from "./assembly.ts";
import { applyPreset, RACK_PRESETS } from "./presets.ts";
import { withSystem, systemLayout } from "./systems.ts";
import { definitions as cables } from "./parts/cable-systems.ts";
import { definitions as smith } from "./parts/smith.ts";
import { detectCollisions } from "./assembly-collisions.ts";
import { resolveMaterial } from "./appearance.ts";
const preset = (
  profile = "rep-pr-5000",
  kind = "six",
  depth = 762,
  height = 2032,
) =>
  applyPreset(
    RACK_PRESETS.find(
      (p) =>
        p.profileId === profile &&
        p.kind === kind &&
        p.depth === depth &&
        p.height === height,
    )!.id,
  );
test("generic source rack remains 75/25/50 and cannot masquerade as vendor cable rack", () => {
  const d = createAssembly();
  assert.equal(d.rack.tube, 75);
  assert.equal(d.rack.holeDiameter, 25);
  assert.equal(d.rack.pitch, 50);
  assert.throws(
    () => validateAssembly(withSystem(d, "cable-kraken")),
    /manufacturer|height|width/,
  );
});
test("ARES four-post documented shallow configuration requires anchoring; deeper four-post is rejected", () => {
  const d = preset("rep-pr-5000", "four", 406.4);
  assert.throws(
    () => validateAssembly(withSystem(d, "cable-ares2")),
    /anchoring/,
  );
  assert.equal(
    validateAssembly(withSystem(d, "cable-ares2", { anchored: 1 })).systems
      ?.length,
    1,
  );
  assert.throws(
    () =>
      validateAssembly(
        withSystem(preset("rep-pr-5000", "four"), "cable-ares2", {
          anchored: 1,
        }),
      ),
    /16-inch/,
  );
  assert.throws(
    () =>
      validateAssembly(
        withSystem(preset("rep-pr-4000", "four", 406.4), "cable-ares2", {
          anchored: 1,
        }),
      ),
    /PR-5000/,
  );
});
test("all cable families use typed persistence and graph coordinates independent of node names", () => {
  for (const family of [
    "cable-ares1",
    "cable-ares2",
    "cable-athena",
  ] as const) {
    const d = preset();
    const mapping = Object.fromEntries(
      Object.keys(d.uprights).map((id, i) => [id, `custom-${i}`]),
    );
    d.uprights = Object.fromEntries(
      Object.entries(d.uprights).map(([id, n]) => [
        mapping[id],
        { x: n.x + 127, y: n.y - 83 },
      ]),
    );
    d.connections = d.connections.map((e) => ({
      ...e,
      from: mapping[e.from],
      to: mapping[e.to],
    }));
    const result = validateAssembly(withSystem(d, family));
    const roundTrip = validateAssembly(JSON.parse(JSON.stringify(result)));
    assert.deepEqual(roundTrip, result);
    const instance = resolveAssembly(result).find((r) => r.part === family)!;
    assert.equal(instance.position[0], 127);
    assert.equal(instance.connectedTo.length, 6);
    assert.equal(instance.params.bore, 25.4);
    assert.equal(instance.params.pitch, 50.8);
    assert.equal(removeInstance(result, instance.id).systems?.length, 0);
  }
});
test("cable bay exclusion and Smith restrictions validate both insertion orders", () => {
  const d = preset("rep-pr-5000", "four");
  const athena = validateAssembly(withSystem(d, "cable-athena"));
  assert.throws(
    () => validateAssembly(withSystem(athena, "smith-rep")),
    /four-post/,
  );
  const smith = validateAssembly(withSystem(d, "smith-rep"));
  assert.throws(
    () => validateAssembly(withSystem(smith, "cable-athena")),
    /four-post/,
  );
  const six = validateAssembly(withSystem(preset(), "cable-ares2"));
  assert.equal(
    validateAssembly(withSystem(six, "smith-rep", { angle: 5 })).systems
      ?.length,
    2,
  );
  assert.throws(
    () => validateAssembly(withSystem(six, "cable-athena")),
    /same side/,
  );
  const pr4 = validateAssembly(
    withSystem(preset("rep-pr-4000"), "cable-ares1"),
  );
  assert.throws(
    () => validateAssembly(withSystem(pr4, "smith-rep", { angle: -5 })),
    /vertical/,
  );
  assert.equal(
    validateAssembly(withSystem(pr4, "smith-rep")).systems?.length,
    2,
  );
});
test("Kraken true 3-inch profiles, bore sizes, bay depths and side variants", () => {
  for (const profile of ["bos-hydra", "bos-manticore"]) {
    const d = preset(profile, "four", 762, 2133.6);
    assert.equal(d.rack.tube, 76.2);
    assert.equal(d.rack.holeDiameter, profile === "bos-hydra" ? 15.875 : 25.4);
    const left = validateAssembly(
      withSystem(d, "cable-kraken", { sides: 1, loading: 0 }),
    );
    assert.equal(
      validateAssembly(withSystem(left, "cable-kraken", { sides: 2 })).systems
        ?.length,
      2,
    );
    assert.throws(
      () => validateAssembly(withSystem(left, "cable-kraken", { sides: 1 })),
      /same side/,
    );
  }
});
test("systems reject malformed params, unsupported angles, outside adapters, bad topology and shaft profiles", () => {
  const d = preset();
  for (const params of [
    { angle: 2 },
    { angle: NaN },
    { outside: 1 },
    { barHeight: 1800 },
    { safetyHeight: 1200 },
  ] as NumericParams[])
    assert.throws(() => validateAssembly(withSystem(d, "smith-rep", params)));
  assert.throws(
    () => validateAssembly(withSystem(d, "cable-ares2", { sides: 1 })),
    /dual/,
  );
  assert.throws(
    () =>
      validateAssembly({
        ...d,
        systems: [{ id: "bad", part: "unknown", params: {} }],
      }),
    /Unknown/,
  );
  d.uprights[Object.keys(d.uprights).at(-1)!].x += 50.8;
  assert.throws(() => systemLayout(d), /align/);
});
test("system dependency removal cascades, and named profiles retain strict tube dimensions", () => {
  const d = validateAssembly(withSystem(preset(), "cable-ares2"));
  assert.equal(removeInstance(d, "front-left").systems?.length, 0);
  assert.throws(
    () =>
      validateAssembly({
        ...preset("bos-manticore", "four", 762, 2133.6),
        rack: {
          ...preset("bos-manticore", "four", 762, 2133.6).rack,
          tube: 75,
        },
      }),
    /Tube/,
  );
});
const ready = Module().then((api) => {
  api.setup();
  return api;
});
for (const def of [...cables, ...smith])
  test(`${def.id} Manifold solids are finite, watertight and preserve semantic materials`, async () => {
    const api = await ready;
    const parts = def.build(api, def.defaults);
    try {
      assert.ok(parts.length > 70, `${parts.length} detailed components`);
      for (const p of parts) {
        assert.equal(p.solid.status(), "NoError", p.name);
        assert.ok(p.solid.volume() > 0, p.name);
        assert.ok(
          [...p.solid.getMesh().vertProperties].every(Number.isFinite),
          p.name,
        );
      }
      const rod = parts.find((p) => p.role === "rod")!;
      assert.ok(rod);
      assert.deepEqual(
        resolveMaterial(rod, { hardwareFinish: "gold" }),
        resolveMaterial(rod, { hardwareFinish: "oxide" }),
      );
      assert.ok(parts.some((p) => p.role === "fastener"));
      assert.ok(parts.some((p) => p.role === "liner"));
    } finally {
      parts.forEach((p) => p.solid.delete());
    }
  });
test("plate loaded variants and tall angled Smith build within published width", async () => {
  const api = await ready;
  for (const def of cables.filter((d) =>
    ["cable-kraken", "cable-athena"].includes(d.id),
  )) {
    const parts = def.build(api, {
      ...def.defaults,
      loading: 0,
      shroud: 0,
      sides: 1,
    });
    try {
      assert.ok(parts.some((p) => p.name.includes("Olympic")));
      assert.ok(!parts.some((p) => p.name.startsWith("Weight stack plate")));
    } finally {
      parts.forEach((p) => p.solid.delete());
    }
  }
  for (const angle of [-5, 5]) {
    const parts = smith[0].build(api, {
      ...smith[0].defaults,
      height: 2362.2,
      angle,
    });
    try {
      assert.equal(
        parts.filter(
          (p) =>
            p.name.startsWith("Racking post ") && !p.name.includes("end cap"),
        ).length,
        38,
      );
      const min = Math.min(...parts.map((p) => p.solid.boundingBox().min[0]));
      const max = Math.max(...parts.map((p) => p.solid.boundingBox().max[0]));
      assert.ok(Math.abs(max - min - 1880) < 1);
    } finally {
      parts.forEach((p) => p.solid.delete());
    }
  }
});
test("static collision envelopes include cable stacks and Smith bar, not whole rack air", () => {
  const d = validateAssembly(
    withSystem(withSystem(preset(), "cable-ares2"), "smith-rep"),
  );
  const systems = resolveAssembly(d).filter(
    (r) => r.part.startsWith("cable-") || r.part === "smith-rep",
  );
  assert.equal(systems.length, 2);
  assert.ok(
    systems.every((s) => s.collisionEnabled && s.collisionBoxes?.length),
  );
  assert.equal(
    systems.find((s) => s.part === "smith-rep")!.collisionBoxes!.length,
    3,
  );
});
test("unknown system metadata is detached and appearance remains optional", () => {
  const d = withSystem(preset(), "cable-athena");
  const input = {
    ...d,
    systems: d.systems!.map((s) => ({
      ...s,
      vendorMetadata: { confidence: "estimated" },
    })),
    appearance: {
      hardwareFinish: "gold",
      overrides: { "system-7": "#ffffff" },
    },
  };
  const clean = validateAssembly(input);
  input.systems[0].vendorMetadata.confidence = "mutated";
  assert.equal(
    (clean.systems![0] as unknown as { vendorMetadata: { confidence: string } })
      .vendorMetadata.confidence,
    "estimated",
  );
  assert.deepEqual(clean.appearance, input.appearance);
});

test("Smith crossmember bolts land on beam lattice and do not claim cable upright slots", () => {
  const d = validateAssembly(
    withSystem(withSystem(preset(), "cable-ares2"), "smith-rep", { angle: 5 }),
  );
  const resolved = resolveAssembly(d),
    s = resolved.find((r) => r.part === "smith-rep")!;
  assert.equal(s.mounts.length, 8);
  for (const m of s.mounts) {
    assert.ok(m.connectorId);
    assert.ok(Number.isInteger(m.hole));
    assert.ok(d.connections.some((e) => e.id === m.connectorId));
  }
  assert.ok(
    !detectCollisions(resolved).some(
      (w) => w.message.includes("share mounting") && w.ids.includes(s.id),
    ),
  );
});
