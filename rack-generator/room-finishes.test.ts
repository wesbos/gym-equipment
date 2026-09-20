import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssembly, validateAssembly } from './assembly.ts';
import { ROOM_DEFAULTS, validateRoom, type Room } from './walls.ts';
import { resolveFinishes, roomLighting, STUDIO_LIGHTING, validateFinishes, type RoomFinishes } from './room-finishes.ts';

const room = (extra: RoomFinishes): Room => ({ ...ROOM_DEFAULTS, ...extra });

test('rooms without finishes validate exactly as before: same fields, same order, today\'s look', () => {
  assert.equal(validateRoom(undefined), undefined);
  assert.deepEqual(Object.keys(validateRoom({ left: 2000 })!), ['back', 'left', 'right', 'front', 'height']);
  assert.deepEqual(validateRoom({ height: 2400, back: 900 }), { ...ROOM_DEFAULTS, height: 2400, back: 900 });
  const doc = createAssembly();
  assert.equal(validateAssembly(doc).room, undefined, 'no room stays no room');
  const f = resolveFinishes(undefined);
  assert.deepEqual({ walls: Object.values(f.surfaces).map(s => s.finish), floor: f.floor, turf: f.turf, ceiling: f.ceiling, showWalls: f.showWalls },
    { walls: ['slat', 'slat', 'slat', 'slat'], floor: 'black-rubber', turf: [], ceiling: null, showWalls: false });
  assert.equal(roomLighting(undefined), STUDIO_LIGHTING, 'default lighting is untouched');
  assert.equal(roomLighting(room({ floor: 'concrete' })), STUDIO_LIGHTING, 'a floor alone does not relight the studio');
});

test('finishes validate strictly and come back in a fixed order', () => {
  const full = validateRoom({
    ceiling: { lights: { along: 'z', count: 4 }, color: '#F4F4F1' },
    turf: [{ size: [1850, 10000], position: [-2300, 6400], lines: true }],
    floor: 'grey-fleck',
    walls: { wainscot: 1220, color: '#F2F1EC', finish: 'wainscot' },
    height: 2750,
  })!;
  assert.deepEqual(Object.keys(full), ['back', 'left', 'right', 'front', 'height', 'walls', 'floor', 'turf', 'ceiling']);
  assert.deepEqual(full.walls, { finish: 'wainscot', color: '#f2f1ec', wainscot: 1220 }, 'colours are lowercased');
  assert.deepEqual(full.ceiling, { color: '#f4f4f1', lights: { count: 4, along: 'z' } });
  assert.deepEqual(validateAssembly({ ...createAssembly(), room: full }).room, full, 'round-trips through the document');
  for (const [input, message] of [
    [{ walls: 'drywall' }, /walls finish must be an object/],
    [{ walls: { finish: 'brick' } }, /Wall finish must be one of/],
    [{ walls: { finish: 'slat', color: '#ffffff' } }, /colour applies to drywall and wainscot/],
    [{ walls: { finish: 'drywall', color: 'white' } }, /six-digit hex/],
    [{ walls: { finish: 'drywall', wainscot: 1000 } }, /applies to wainscot walls/],
    [{ walls: { finish: 'wainscot', wainscot: 3000 } }, /Wainscot height/],
    [{ walls: { finish: 'wainscot', wainscot: 2400 }, height: 2300 }, /Wainscot height/],
    [{ walls: { finish: 'birch', texture: 'oak' } }, /Unknown wall finish field "texture"/],
    [{ floor: 'carpet' }, /Floor finish must be one of/],
    [{ turf: { position: [0, 0], size: [1000, 1000] } }, /Turf must be a list/],
    [{ turf: Array(9).fill({ position: [0, 0], size: [1000, 1000] }) }, /up to 8/],
    [{ turf: [{ position: [0, 0], size: [100, 1000] }] }, /Turf size/],
    [{ turf: [{ position: [0, 99999], size: [1000, 1000] }] }, /Turf position/],
    [{ turf: [{ position: [0, 0], size: [1000, 1000], lines: 'yes' }] }, /true or false/],
    [{ turf: [{ position: [0, 0], size: [1000, 1000], rotation: 1 }] }, /Unknown turf lane field/],
    [{ ceiling: true }, /Ceiling must be an object/],
    [{ ceiling: { lights: { count: 0, along: 'x' } } }, /light rows/],
    [{ ceiling: { lights: { count: 2.5, along: 'x' } } }, /light rows/],
    [{ ceiling: { lights: { count: 2, along: 'y' } } }, /along x or z/],
    [{ ceiling: { color: '#fff' } }, /Ceiling colour/],
    [{ carpet: true }, /Invalid room walls/],
    [{ walls: { finish: 'drywall', overrides: { ceiling: { finish: 'birch' } } } }, /Unknown wall override field "ceiling"/],
    [{ walls: { finish: 'drywall', overrides: { back: { finish: 'slat', overrides: {} } } } }, /Unknown wall finish field "overrides"/],
    [{ walls: { finish: 'drywall', overrides: { back: { finish: 'birch', color: '#ffffff' } } } }, /colour applies/],
    [{ turf: [{ position: [0, 0], size: [1000, 1000], text: 'plae' }] }, /Turf text/],
    [{ turf: [{ position: [0, 0], size: [1000, 1000], text: 'A VERY LONG STENCIL' }] }, /Turf text/],
    [{ turf: [{ position: [0, 0], size: [1000, 1000], text: 'PLAE', textRotation: 45 }] }, /Turf text rotation/],
  ] as [Record<string, unknown>, RegExp][]) assert.throws(() => validateRoom(input), message, JSON.stringify(input));
  assert.deepEqual(validateFinishes({ floor: 'wood' }, 3000), { floor: 'wood' }, 'only present fields');
  assert.deepEqual(validateRoom({ turf: [{ text: 'PLAE', lines: true, size: [1800, 9000], position: [0, 0] }] })!.turf, [{ position: [0, 0], size: [1800, 9000], lines: true, text: 'PLAE' }]);
  assert.deepEqual(validateRoom({ turf: [{ text: 'PLAE', textRotation: 90, size: [1800, 9000], position: [0, 0] }] })!.turf, [{ position: [0, 0], size: [1800, 9000], text: 'PLAE', textRotation: 90 }], 'stencil rotation round-trips');
  assert.deepEqual(validateRoom({ turf: [{ text: 'PLAE', textRotation: 0, size: [1800, 9000], position: [0, 0] }] })!.turf, [{ position: [0, 0], size: [1800, 9000], text: 'PLAE' }], 'zero rotation is the default');
});

test('per-wall overrides: each wall resolves its own surface, the rest follow the room', () => {
  const walls = validateRoom({ walls: { finish: 'wainscot', color: '#F2F1EC', overrides: { front: { finish: 'drywall' }, back: { finish: 'birch' } } } })!.walls!;
  assert.deepEqual(walls, { finish: 'wainscot', color: '#f2f1ec', overrides: { back: { finish: 'birch' }, front: { finish: 'drywall' } } }, 'overrides come back in wall order');
  const { surfaces } = resolveFinishes({ walls }, 2750);
  assert.deepEqual(surfaces, {
    back: { finish: 'birch', color: '#f2f1ec', wainscot: 1220 },
    left: { finish: 'wainscot', color: '#f2f1ec', wainscot: 1220 },
    right: { finish: 'wainscot', color: '#f2f1ec', wainscot: 1220 },
    front: { finish: 'drywall', color: '#f2f1ec', wainscot: 1220 },
  });
  assert.ok(roomLighting(room({ walls: { finish: 'slat', overrides: { back: { finish: 'drywall', color: '#ffffff' } } } })).hemisphere > STUDIO_LIGHTING.hemisphere, 'one white wall brightens a slat room a little');
});

test('brighter finishes lift the fill and pull back key and exposure; dark rooms stay studio-lit', () => {
  const white = roomLighting(room({ walls: { finish: 'drywall', color: '#ffffff' }, ceiling: { lights: { count: 4, along: 'x' } } }));
  assert.ok(white.hemisphere > STUDIO_LIGHTING.hemisphere && white.environment > STUDIO_LIGHTING.environment);
  assert.ok(white.key < STUDIO_LIGHTING.key && white.exposure < STUDIO_LIGHTING.exposure);
  const charcoal = roomLighting(room({ walls: { finish: 'drywall', color: '#1e1e20' } }));
  assert.ok(charcoal.hemisphere - STUDIO_LIGHTING.hemisphere < 0.01, 'near-black paint barely changes anything');
  assert.equal(roomLighting(room({ walls: { finish: 'slat' } })), STUDIO_LIGHTING);
});
