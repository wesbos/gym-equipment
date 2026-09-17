import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { finalizeLogo, checkCut } from './logos/contours.ts';
import { textContours, svgContours, safeSvg, traceBitmap } from './logos/sources.ts';
import { validateLogo, type LogoSource } from './logos/types.ts';
import { addAccessory, createAssembly, replaceStructurePart, resolveAssembly, validateAssembly } from './assembly.ts';
import { definitions } from './parts/structure.ts';
const api = await Module(); api.setup();
const source: LogoSource = { kind: 'text', font: 'helvetiker', text: 'BOS' };
const make = () => finalizeLogo(api, source, textContours(source), true);
test('bundled text counters get connected steel bridges', () => {
  const logo = make(); assert.ok(logo.bridges >= 2); checkCut(api, logo.loops);
  assert.throws(() => finalizeLogo(api, source, textContours(source), false), /bridges/);
  for (const font of ['helvetiker', 'helvetikerRegular'] as const) { const sample: Extract<LogoSource, { kind: 'text' }> = { ...source, font, text: 'GYM' }; assert.ok(finalizeLogo(api, sample, textContours(sample), true).loops.length); }
});
test('SVG transforms, fill rules, curves and expanded strokes produce bounded contours', () => {
  for (const svg of [
    '<svg><g transform="translate(15 4) rotate(15)"><rect x="0" y="0" width="60" height="20"/></g></svg>',
    '<svg><path fill-rule="evenodd" d="M0 0H60V30H0Z M10 10H50V20H10Z"/></svg>',
    '<svg><path fill-rule="nonzero" d="M0 0H60V30H0Z M10 10H50V20H10Z"/></svg>',
    '<svg><path style="fill:none;stroke:black;stroke-width:5;stroke-linecap:round" d="M0 10 C20 0 40 20 60 10"/></svg>',
  ]) assert.ok(finalizeLogo(api, { kind: 'svg', data: svg }, svgContours(api, svg), true).loops.length);
  const even = svgContours(api, '<svg><path fill-rule="evenodd" d="M0 0H60V30H0Z M10 10H50V20H10Z"/></svg>');
  const nonzero = svgContours(api, '<svg><path fill-rule="nonzero" d="M0 0H60V30H0Z M10 10H50V20H10Z"/></svg>');
  assert.equal(even.length, 2); assert.equal(nonzero.length, 1);
});
test('untrusted/unsupported SVG is rejected without evaluating references', () => {
  for (const s of ['<!DOCTYPE svg><svg/>', '<svg><script>alert(1)</script></svg>', '<svg><image href="https://evil.test/x"/></svg>', '<svg><use href="#x"/></svg>', '<svg><path onclick="x()"/></svg>', '<svg><path fill="url(https://evil.test)"/></svg>', '<svg><mask/></svg>', '<svg><path style="display:none"/></svg>', '<svg><g></svg>']) assert.throws(() => safeSvg(s));
  assert.throws(() => safeSvg('<svg>' + '<g>'.repeat(20) + '</g>'.repeat(20) + '</svg>'), /budget/);
});
test('raster tracing respects alpha, threshold and bounded dimensions', () => {
  const pixels = new Uint8ClampedArray(20 * 10 * 4).fill(255);
  for (let y = 2; y < 8; y++) for (let x = 2; x < 18; x++) pixels.set([100, 100, 100, 255], (y * 20 + x) * 4);
  const loops = traceBitmap(pixels, 20, 10, 128, 1); assert.equal(loops.length, 1); assert.equal(loops[0].length, 4);
  assert.throws(() => traceBitmap(pixels, 20, 10, 80, 1), /empty/);
  assert.throws(() => traceBitmap(pixels, 4096, 4096, 128, 1), /dimensions/);
});
test('malformed, unclosed, overbudget, floating and narrow cuts are rejected', () => {
  const logo = make();
  assert.throws(() => validateLogo({ ...logo, loops: [[[0,0], [1,0], [1,1], [0,1]]] }), /Invalid logo/);
  assert.throws(() => validateLogo({ ...logo, loops: Array(129).fill(logo.loops[0]) }), /Invalid logo/);
  assert.throws(() => checkCut(api, [[[-10,-10],[10,-10],[10,10],[-10,10]], [[-5,-5],[5,-5],[5,5],[-5,5]]]), /islands/);
  assert.throws(() => checkCut(api, [[[0,0],[20,0],[20,.2],[0,.2]]]), /minimum/);
  assert.throws(() => checkCut(api, [[[0,0],[20,20],[0,20],[20,0]]]), /Self-intersecting/);
  assert.throws(() => checkCut(api, [[[0,0],[.1,0],[.1,.1],[0,.1]], [[2,0],[5,0],[5,3],[2,3]]]), /minimum/);
  assert.throws(() => checkCut(api, [[[-10,-10],[0,-10],[0,10],[-10,10]], [[.2,-10],[10,-10],[10,10],[.2,10]]]), /minimum/);
});
test('logo data survives document normalization and applies only to BOS logo sites', () => {
  const doc = replaceStructurePart(createAssembly(), 'rear-crossmember', 'nameplate'); doc.logo = make();
  const copy = validateAssembly(JSON.parse(JSON.stringify(doc))); assert.deepEqual(copy.logo, doc.logo); assert.notEqual(copy.logo, doc.logo);
  const resolved = resolveAssembly(copy); assert.ok(resolved.find(r => r.part === 'nameplate')?.logo);
  assert.ok(resolved.filter(r => r.part !== 'nameplate').every(r => !r.logo));
  delete copy.logo; assert.ok(resolveAssembly(copy).every(r => !r.logo));
});
for (const id of ['nameplate', 'branded-crossmember', 'branded-crossmember-lite']) test(`${id} contains real manifold through-cuts and no floating steel islands`, () => {
  const def = definitions.find(d => d.id === id)!, logo = make();
  const stock = def.build(api, def.defaults), custom = def.build(api, def.defaults, logo);
  try {
    assert.notEqual(stock.reduce((n,p)=>n+p.solid.volume(),0),custom.reduce((n,p)=>n+p.solid.volume(),0));
    for (const p of custom) {
      assert.equal(p.solid.status(), 'NoError'); assert.ok(p.solid.volume() > 0);
      const mesh=p.solid.getMesh(); assert.ok(mesh.triVerts.length > 0);
      if (/stencil|branded/.test(p.name)) { const pieces=p.solid.decompose(); try { assert.equal(pieces.length, 1); } finally { pieces.forEach(s=>s.delete()); } }
    }
  } finally { [...stock,...custom].forEach(p=>p.solid.delete()); }
});
test('SVG nonuniformly transformed line strokes retain their true outline', () => {
  const loops = svgContours(api, '<svg><line x1="0" y1="0" x2="20" y2="0" fill="none" stroke="black" stroke-width="4" transform="scale(3 2)"/></svg>');
  const xs=loops.flat().map(p=>p[0]), ys=loops.flat().map(p=>p[1]);
  assert.ok(Math.abs(Math.max(...xs)-Math.min(...xs)-60)<.001);
  assert.ok(Math.abs(Math.max(...ys)-Math.min(...ys)-8)<.001);
});

test('automatic bridges reject rather than silently erase tiny artwork', () => {
  const data = '<svg><rect width="100" height="24"/><path fill-rule="evenodd" d="M105 0h.5v.5h-.5Z M105.1 .1h.3v.3h-.3Z"/></svg>';
  assert.throws(() => finalizeLogo(api, { kind: 'svg', data }, svgContours(api, data), true), /erase a small detail/);
});

test('user logos stay on BOS sites while real Darko vendor marks remain isolated', () => {
  const doc = addAccessory(replaceStructurePart(createAssembly({emptyAccessories:true}), 'rear-crossmember', 'nameplate'), 'darko-anchor', {kind:'crossmember-top',connectionId:'left-upper-crossmember',station:3,side:1,uprightId:'front-left',face:'front',hole:0},true);
  doc.logo=make();const instances=resolveAssembly(doc);
  assert.ok(instances.find(r=>r.part==='nameplate')?.logo);
  const vendor=instances.filter(r=>r.part==='darko-anchor');assert.equal(vendor.length,2);assert.ok(vendor.every(r=>r.logo===undefined));
});
