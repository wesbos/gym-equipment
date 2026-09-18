import { test } from "node:test";
import assert from "node:assert/strict";
import Module from "manifold-3d";
import { definitions, SMITH_GUIDE_X } from "./parts/smith.ts";
import { smithLayout } from "./system-mounts.ts";
import type { SolidPart, NumericParams, Vec3 } from "./types.ts";

const api = await Module();
api.setup();
const definition = definitions[0];
function overlap(a: SolidPart, b: SolidPart) {
  const intersection = a.solid.intersect(b.solid);
  try {
    return intersection.volume();
  } finally {
    intersection.delete();
  }
}
function close(a: number, b: number, message = "") {
  assert.ok(Math.abs(a - b) < 1e-6, `${message}: ${a} vs ${b}`);
}
for (const height of [2032, 2362.2])
  for (const [angle, outside] of [
    [-5, 0],
    [0, 0],
    [5, 0],
    [0, 1],
  ]) {
    test(`Smith ${height} mm, ${angle} degrees, ${outside ? "front" : "inside"}: shaft clears carriage and follows shared collision frame`, () => {
      const p: NumericParams = {
        ...definition.defaults,
        height,
        angle,
        outside,
      };
      const layout = smithLayout(p);
      const parts = definition.build(api, p);
      try {
        const shaft = parts.find(
          (part) => part.name === "Polished 35 mm Smith bar shaft",
        )!;
        const plates = parts.filter(
          (part) => part.name === "Carriage side plate",
        );
        assert.equal(plates.length, 2);
        for (const plate of plates)
          assert.ok(
            overlap(shaft, plate) < 1e-6,
            "shaft must pass through the bored plate",
          );
        const guides = parts.filter(
          (part) => part.name === "Polished Smith guide rod",
        );
        const bearings = parts.filter(
          (part) => part.name === "Smith linear bearing housing",
        );
        for (const guide of guides)
          for (const bearing of bearings)
            assert.ok(
              overlap(guide, bearing) < 1e-6,
              "bearing must remain coaxial and clear the guide",
            );
        const sleeves = parts.filter(
          (part) => part.name === "289.5 mm loadable Olympic sleeve",
        );
        const boxes = layout.barCollisionBoxes();
        for (const [i, part] of [shaft, ...sleeves].entries()) {
          const bounds = part.solid.boundingBox();
          for (let axis = 0; axis < 3; axis++) {
            close(
              bounds.min[axis],
              boxes[i].min[axis],
              `${part.name} lower collision bound`,
            );
            close(
              bounds.max[axis],
              boxes[i].max[axis],
              `${part.name} upper collision bound`,
            );
          }
        }
        const bounds = shaft.solid.boundingBox();
        close(
          (bounds.min[2] + bounds.max[2]) / 2,
          p.barHeight,
          "barHeight stays actual shaft height",
        );
        if (angle === 0) {
          const old = layout.at(0, p.barHeight);
          old[1] -= 60;
          layout
            .barAt(0)
            .forEach((value, axis) =>
              close(
                value,
                old[axis],
                "vertical/front shaft position unchanged",
              ),
            );
        }
      } finally {
        parts.forEach((part) => part.solid.delete());
      }
    });
  }
test("Smith shared carriage bore stays on shaft axis at both travel limits and all supported angles", () => {
  for (const height of [2032, 2362.2])
    for (const angle of [-5, 0, 5])
      for (const barHeight of [396, height === 2032 ? 1721 : 2029]) {
        const layout = smithLayout({
          ...definition.defaults,
          height,
          angle,
          barHeight,
        });
        for (const side of [-1, 1]) {
          const bore = layout.carriageAt([side * (SMITH_GUIDE_X + 37), -60, 0]);
          const shaft = layout.barAt(bore[0]);
          bore.forEach((value, axis) => close(value, shaft[axis]));
          close(shaft[2], barHeight);
          const bearing = layout.carriageAt([side * SMITH_GUIDE_X, 0, 52]);
          const guide = layout.at(bearing[0], bearing[2]);
          close(bearing[1], guide[1], "bearing on guide at travel limit");
        }
      }
});

test("published lower travel and contextual height resets retain real carriage/safety clearance", async () => {
  const { smithHeightControls, SMITH_SAFETY_GAP, SMITH_SAFETY_MIN } =
    await import("./smith-heights.ts");
  const { validateSystemParams } = await import("./systems.ts");
  const validate = (p: NumericParams) =>
    validateSystemParams("smith-rep", {
      barHeight: p.barHeight,
      safetyHeight: p.safetyHeight,
      angle: p.angle,
      outside: p.outside,
    });
  for (const height of [2032, 2362.2])
    for (const angle of [-5, 0, 5]) {
      const p = {
        ...definition.defaults,
        height,
        angle,
        barHeight: 396,
        safetyHeight: SMITH_SAFETY_MIN,
      };
      validate(p);
      const controls = smithHeightControls(p, height);
      assert.equal(controls.barMin, 396);
      assert.equal(controls.safetyDefault, controls.safetyMax);
      const parts = definition.build(api, p);
      try {
        const moving = parts.filter((s) =>
          /Carriage side plate|Smith linear bearing housing|Polished 35 mm Smith bar shaft/.test(
            s.name,
          ),
        );
        const stops = parts.filter((s) =>
          /Low-profile Smith safety stop|Safety stop impact pad/.test(s.name),
        );
        for (const a of moving)
          for (const b of stops)
            assert.ok(overlap(a, b) < 0.05, `${angle}° ${a.name}/${b.name}`);
      } finally {
        parts.forEach((p) => p.solid.delete());
      }
      for (const [barHeight, safetyHeight] of [
        [600, 400],
        [1600, 1400],
      ]) {
        const current = { ...p, barHeight, safetyHeight },
          c = smithHeightControls(current, height);
        const resetSafety = { ...current, safetyHeight: c.safetyDefault };
        const resetBar = { ...current, barHeight: c.barDefault };
        validate(resetSafety);
        validate(resetBar);
        assert.equal(
          smithHeightControls(resetSafety, height).safetyDefault,
          resetSafety.safetyHeight,
        );
        assert.equal(
          smithHeightControls(resetBar, height).barDefault,
          resetBar.barHeight,
        );
        assert.equal(resetSafety.barHeight, barHeight);
        assert.equal(resetBar.safetyHeight, safetyHeight);
        assert.ok(resetBar.barHeight >= safetyHeight + SMITH_SAFETY_GAP);
      }
    }
});

// Photo-audit fixtures (reference/photos/smith-rep/DISCREPANCIES.md): REP's ladder sits inboard of
// the guide, the hook swings between its plates, and the carriage clears rungs, ladder and posts.
test("Smith ladder, hook and carriage keep the REP arrangement and clear each other through travel", async () => {
  const { SMITH_GUIDE_X, SMITH_LADDER } = await import("./parts/smith.ts");
  const box = (min: Vec3, max: Vec3) =>
    api.Manifold.cube(max.map((v, i) => v - min[i]) as Vec3).translate(min);
  const absRange = (s: SolidPart) => {
    const { min, max } = s.solid.boundingBox();
    return [Math.min(Math.abs(min[0]), Math.abs(max[0])), Math.max(Math.abs(min[0]), Math.abs(max[0]))];
  };
  const mid = (s: SolidPart) => (s.solid.boundingBox().min[0] + s.solid.boundingBox().max[0]) / 2;
  for (const height of [2032, 2362.2])
    for (const angle of [-5, 0, 5])
      for (const barHeight of [396, 1100, height === 2032 ? 1721 : 2029]) {
        const p: NumericParams = { ...definition.defaults, height, angle, barHeight, safetyHeight: 246 };
        const parts = definition.build(api, p);
        const post: SolidPart = { ...parts[0], solid: box([p.rackWidth / 2 - 37.5, -37.5, 0], [p.rackWidth / 2 + 37.5, 37.5, height]) };
        try {
          const named = (re: RegExp) => parts.filter((s) => re.test(s.name));
          const label = `${height} ${angle}° bar ${barHeight}`;
          const hooks = named(/^Rotating bar locking hook$|^Composite hook contact liner$/),
            fixed = named(/^Racking post \d+ of|^Smith catch ladder/),
            carriage = named(/^Smith linear bearing housing$|^Carriage (side plate|inner gusset|bar flange bearing)$/);
          assert.equal(named(/^Smith catch ladder plate/).length, 4);
          for (const a of [...hooks, ...carriage]) {
            for (const b of fixed) assert.ok(overlap(a, b) < 1e-6, `${label}: ${a.name} / ${b.name}`);
            assert.ok(overlap(a, post) < 1e-6, `${label}: ${a.name} clears the front post`);
          }
          const shaft = named(/Smith bar shaft/)[0];
          for (const a of named(/^Carriage (inner gusset|bar flange bearing)$/))
            assert.ok(overlap(shaft, a) < 1e-6, `${a.name} is bored for the shaft`);
          for (const side of [-1, 1]) {
            const mine = (re: RegExp) => named(re).filter((s) => Math.sign(mid(s)) === side);
            const plates = mine(/^Smith catch ladder plate/).map((s) => Math.abs(mid(s))).sort((a, b) => a - b);
            close(plates[0], SMITH_GUIDE_X - SMITH_LADDER.inner, "inner ladder plate");
            close(plates[1], SMITH_GUIDE_X - SMITH_LADDER.outer, "outer ladder plate");
            const [lo, hi] = absRange(mine(/^Rotating bar locking hook$/)[0]);
            assert.ok(lo > plates[0] + 3 && hi < plates[1] - 3, `hook plane stays between the ladder plates (${lo}–${hi})`);
            const collar = absRange(mine(/^Sleeve shoulder collar$/)[0])[0],
              flange = absRange(mine(/^Carriage bar flange bearing$/)[0])[1];
            assert.ok(collar - flange > 0 && collar - flange < 10, `collar sits just outboard of the flange bearing (${collar - flange})`);
          }
        } finally {
          post.solid.delete();
          parts.forEach((part) => part.solid.delete());
        }
      }
});

test("Smith finish roles: metallic-black upright, chrome guides/rungs/bar/hook, composite liners", async () => {
  const { resolveMaterial } = await import("./appearance.ts");
  const parts = definition.build(api, definition.defaults);
  try {
    const roles = (name: string) => [...new Set(parts.filter((s) => s.name.startsWith(name)).map((s) => s.role))];
    for (const name of ["Smith catch ladder plate", "Smith linear bearing housing", "Carriage side plate", "Low-profile Smith safety stop", "Smith upright end plate"]) {
      assert.deepEqual(roles(name), ["source"], name);
      const s = parts.find((part) => part.name.startsWith(name))!;
      assert.equal(resolveMaterial(s, { frameColor: "#a9232c" }).color, "#353739", `${name} ignores rack paint`);
    }
    for (const name of ["Polished Smith guide rod", "Racking post 1 of", "Polished 35 mm Smith bar shaft"])
      assert.deepEqual(roles(name), ["rod"], name);
    assert.deepEqual(roles("Rotating bar locking hook"), ["sleeve"]);
    for (const name of ["Composite hook contact liner", "Safety stop impact pad", "Linear bearing dust seal"])
      assert.deepEqual(roles(name), ["liner"], name);
    assert.ok(!parts.some((s) => s.name === "Bar rotation lever"), "REP bar is rotated by hand; no lever");
  } finally {
    parts.forEach((part) => part.solid.delete());
  }
});

test("front Smith FFE 2.0 drops to a floor toe at the published 658.35 mm; upper bracket has only paired holes", () => {
  const p: NumericParams = { ...definition.defaults, outside: 1 };
  const parts = definition.build(api, p);
  try {
    const face = -p.tube / 2;
    const feet = parts.filter((s) => s.name === "FFE 2.0 floor foot plate");
    assert.equal(feet.length, 2);
    for (const foot of feet) {
      const b = foot.solid.boundingBox();
      close(b.min[2], 0, "foot on floor");
      close(b.min[1], face - 658.35, "published FFE length");
    }
    for (const tube of parts.filter((s) => s.name === "FFE 2.0 drilled extension tube")) {
      const b = tube.solid.boundingBox();
      close(b.min[2], 6, "tube seats on the sole plate");
      close(b.max[2], smithLayout(p).lowerBeam + p.tube / 2, "level run at lower crossmember height");
    }
    const upper = parts.find((s) => s.name === "Smith front extension drilled tube")!;
    const shell = (75 * 75 - 69 * 69) * 176.5,
      holes = 2 * 2 * 3 * Math.PI * (p.bore / 2) ** 2;
    assert.ok(Math.abs(shell - holes - upper.solid.volume()) < 0.01 * shell, "two lateral through-holes only");
  } finally {
    parts.forEach((part) => part.solid.delete());
  }
});
