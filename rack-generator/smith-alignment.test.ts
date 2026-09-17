import { test } from "node:test";
import assert from "node:assert/strict";
import Module from "manifold-3d";
import { definitions } from "./parts/smith.ts";
import { smithLayout } from "./system-mounts.ts";
import type { SolidPart, NumericParams } from "./types.ts";

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
          const bore = layout.carriageAt([side * (529 + 37), -60, 0]);
          const shaft = layout.barAt(bore[0]);
          bore.forEach((value, axis) => close(value, shaft[axis]));
          close(shaft[2], barHeight);
          const bearing = layout.carriageAt([side * 529, 0, 52]);
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
