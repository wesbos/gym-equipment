import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import { RACK_PRESETS, applyPreset } from './presets.ts';
import { addAccessory, createAssembly, getMounts, resizeAssembly, resolveAssembly, validateAssembly } from './assembly.ts';
import { extendUpright } from './graph-edits.ts';
import { definitions } from './parts/structure.ts';
import { definitions as bars } from './parts/bars-safeties.ts';
const pick = (profile:string,kind='four') => applyPreset(RACK_PRESETS.find(p=>p.profileId===profile && p.kind===kind && p.depth===762)!.id);
const api = await Module(); api.setup();
test('enabled REP presets retain exact pitch, bore, dimensions, graph extension and round-trip',()=>{
  for (const p of RACK_PRESETS.filter(p=>['rep-pr-5000','rep-pr-4000'].includes(p.profileId))) {
    const doc = applyPreset(p.id);
    assert.equal(doc.rack.pitch,50.8);
    assert.equal(doc.rack.holeDiameter,p.profileId==='rep-pr-4000'?15.875:25.4);
    assert.equal(doc.rack.height,p.height); assert.equal(doc.rack.depth,p.depth);
    assert.equal(Object.keys(doc.uprights).length,p.kind==='six'?6:4);
    assert.deepEqual(validateAssembly(JSON.parse(JSON.stringify(doc))),doc);
    assert.ok(resolveAssembly(doc).every(r=>r.position.every(Number.isFinite)));
  }
  const doc=pick('rep-pr-5000');
  const extended=extendUpright(doc,'rear-left','rear',406.4);
  const node=Object.values(extended.uprights).at(-1)!;
  assert.ok(Math.abs(node.y-doc.uprights['rear-left'].y-481.4)<1e-8);
  assert.equal(resizeAssembly(doc,{depth:750}).rack.depth,762);
  assert.equal(createAssembly().rack.pitch,50); assert.equal(createAssembly().rack.holeDiameter,25);
});
test('PR4000 fractional bench stations exist only on front/back faces and within estimated zone',()=>{
  const doc=pick('rep-pr-4000'), mounts=getMounts(doc);
  assert.ok(mounts.some(m=>m.hole===8.5 && m.face==='front'));
  assert.ok(!mounts.some(m=>m.hole===8.5 && m.face==='left'));
  assert.ok(!mounts.some(m=>m.hole===7.5 || m.hole===22.5));
  const withHook=addAccessory(doc,'j-hook-standard',{hole:8.5,face:'front'},false);
  assert.equal(resolveAssembly(withHook).find(r=>r.part==='j-hook-standard')!.mount!.center[2],65+8.5*50.8);
  assert.throws(()=>addAccessory(doc,'j-hook-standard',{hole:8.5,face:'left'},false),/Invalid connection/);
  assert.throws(()=>addAccessory(doc,'landmine'),/50 mm/);
});
test('Manifold profile uprights drill real 50.8 mm stations and separate PR4000 25.4 mm bench bores',()=>{
  for(const profile of ['rep-pr-5000','rep-pr-4000']) {
    const doc=pick(profile), r=resolveAssembly(doc).find(r=>r.part==='upright')!;
    const parts=definitions.find(d=>d.id==='upright')!.build(api,r.params);
    try {
      const tube=parts[0].solid;
      assert.equal(tube.status(),'NoError');
      const regular=65+9*50.8, half=65+8.5*50.8;
      assert.equal(tube.rayCast([15,-100,regular],[15,100,regular]).length,0);
      assert.equal(tube.rayCast([-100,0,regular],[100,0,regular]).length,0);
      assert.equal(tube.rayCast([15,-100,half],[15,100,half]).length===0,profile==='rep-pr-4000');
      assert.ok(tube.rayCast([-100,0,half],[100,0,half]).length>0);
    } finally {parts.forEach(p=>p.solid.delete());}
  }
});
test('reconstructed flanges and pull-up plates use integral manufacturer bolt stations',()=>{
  const doc=addAccessory(pick('rep-pr-5000'),'pullup-straight',{hole:25},false);
  const instances=resolveAssembly(doc);
  assert.equal(instances.find(r=>r.part.startsWith('crossmember-'))!.params.plateHeight,151.6);
  const bar=instances.find(r=>r.part==='pullup-straight')!;
  assert.equal(bar.params.mountSpacing,203.2);
  const parts=bars.find(d=>d.id===bar.part)!.build(api,bar.params);
  try {for(const p of parts){assert.equal(p.solid.status(),'NoError');assert.ok(p.solid.volume()>0);}}
  finally{parts.forEach(p=>p.solid.delete());}
});

test('resizing the main REP bay preserves the rear 16-inch storage bay',()=>{
  const doc=pick('rep-pr-5000','six');
  const changed=resizeAssembly(doc,{depth:1041.4});
  const rear=changed.uprights['rear-left'];
  const extension=changed.connections.find(e=>e.from==='rear-left' && e.to.startsWith('upright-'))!;
  assert.ok(Math.abs(changed.uprights[extension.to].y-rear.y-changed.rack.tube-406.4)<1e-8);
});

test('rack bore rejects oversized actual safety and source shafts without resizing hook pins', () => {
  const doc = pick('rep-pr-4000');
  const target = { uprightId: 'front-left', face: 'right' as const, hole: 12 };
  for (const part of ['safety-pin-pipe', 'safety-box', 'safety-webbing', 'spotter-arm', 'dip-horn', 'monolift', 'storage-pin-short', 'storage-pin-long']) {
    assert.throws(() => addAccessory(doc, part, target, false), /retaining pin\/bolt diameter .* exceeds the rack bore 15.875/);
    assert.doesNotThrow(() => addAccessory(createAssembly(), part, target, false));
  }
  for (const part of ['j-hook-standard', 'j-hook-roller', 'j-hook-sandwich']) {
    assert.doesNotThrow(() => addAccessory(doc, part, target, false));
  }
  const source = addAccessory(createAssembly(), 'safety-pin-pipe', target, false).accessories.find(a => a.part === 'safety-pin-pipe')!;
  const fitted = validateAssembly({ ...doc, accessories: [{ ...source, params: { pinDiameter: 15.5 } }] });
  const resolved = resolveAssembly(fitted).find(p => p.part === 'safety-pin-pipe')!;
  assert.equal(resolved.params.pinDiameter, 15.5);
  const geometry = bars.find(p => p.id === 'safety-pin-pipe')!.build(api, resolved.params);
  try {
    const pin = geometry.find(p => p.role === 'rod')!;
    const bounds = pin.solid.boundingBox();
    assert.ok(Math.abs(bounds.max[1] - bounds.min[1] - 15.5) < 0.001);
  } finally { geometry.forEach(p => p.solid.delete()); }
  for (const pinDiameter of [15.876, 16, 26]) {
    assert.throws(() => validateAssembly({ ...fitted, accessories: [{ ...fitted.accessories[0], params: { pinDiameter } }] }), /exceeds the rack bore/);
  }
  assert.throws(() => validateAssembly({ ...createAssembly(), accessories: [{ ...source, params: { pinDiameter: 26 } }] }), /rack bore 25/);
});
