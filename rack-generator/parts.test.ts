import { test } from "node:test";
import assert from "node:assert/strict";
import Module from "manifold-3d";
import { definitions as structure } from "./parts/structure.ts";
import { definitions as attachments } from "./parts/attachments.ts";
import { definitions as bars } from "./parts/bars-safeties.ts";
const api = await Module();
api.setup();
const definitions = [...structure, ...attachments, ...bars];
test("catalog has unique IDs and source references", () => {
  assert.equal(new Set(definitions.map((d) => d.id)).size, definitions.length);
  assert.equal(definitions.length, 28);
  for (const d of definitions) assert.ok(d.reference?.node);
});
for (const def of definitions)
  test(`${def.id}: finite closed solids`, () => {
    const parts = def.build(api, def.defaults);
    try {
      assert.ok(parts.length);
      for (const { solid, name, role } of parts) {
        assert.ok(["frame", "fastener", "handle", "rod", "sleeve", "liner", "source"].includes(role), `${name}: semantic material role`);
        assert.equal(solid.status(), "NoError", name);
        assert.ok(solid.volume() > 0, name);
        const mesh = solid.getMesh();
        assert.ok([...mesh.vertProperties].every(Number.isFinite));
        const edges = new Map();
        for (let i = 0; i < mesh.triVerts.length; i += 3)
          for (let k = 0; k < 3; k++) {
            const a = mesh.triVerts[i + k],
              b = mesh.triVerts[i + ((k + 1) % 3)],
              key = [Math.min(a, b), Math.max(a, b)].join(":");
            edges.set(key, (edges.get(key) || 0) + 1);
          }
        assert.ok(
          [...edges.values()].every((n) => n === 2),
          `${name}: closed edges`
        );
      }
    } finally {
      parts.forEach((p) => p.solid.delete());
    }
  });
