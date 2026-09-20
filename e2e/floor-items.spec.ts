import { unzipSync, strFromU8 } from 'fflate';
import { addFromGallery } from './part-gallery.ts';
import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs/promises';

test('gym-wave2-floor_items: ghost, plane drag, snap, rotate, Escape, undo, inspector, Save and GLB', async () => {
  test.setTimeout(240000);
  if (!process.env.GYM_FLOOR_CDP_URL) throw Error('Use isolated gym-wave2-floor_items session, port 5316, and set GYM_FLOOR_CDP_URL.');
  const browser = await chromium.connectOverCDP(process.env.GYM_FLOOR_CDP_URL, {timeout:15000});
  try {
  const base = process.env.GYM_FLOOR_BASE_URL ?? 'http://127.0.0.1:5316';
  const page = browser.contexts()[0].pages().find(p => p.url().startsWith(base))!;
  await page.setViewportSize({width:1280,height:633});
  await page.evaluate(() => localStorage.removeItem('bos-strength-configurations-v1'));
  await page.reload();
  const chooseExport=async(format:'GLB'|'3MF')=>{
    if(await page.locator('#export').getAttribute('aria-expanded')!=='true')await page.locator('#export').click();
    await page.getByRole('menuitemradio',{name:new RegExp(format)}).click();
    await expect(page.getByRole('button',{name:`Download ${format}`,exact:true})).toBeEnabled({timeout:30000});
  };
  const ready=async()=>{await chooseExport('GLB');await page.keyboard.press('Escape');};
  // The recovery draft is debounced (AUTOSAVE_DELAY_MS, then idle time): let a pending write land before reading it.
  const floor=()=>page.evaluate(async()=>{await new Promise(r=>setTimeout(r,450));await new Promise(r=>requestIdleCallback(()=>r(null),{timeout:1000}));await new Promise(r=>setTimeout(r,0));const data=JSON.parse(localStorage.getItem('bos-strength-configurations-v1') ?? '{}');return (data.draft ?? data.configs?.find((c:{id:string})=>c.id===data.activeId)?.doc)?.floorItems ?? [];});
  await ready(); console.log('Rack ready');
  await addFromGallery(page,'rep-nighthawk');
  await expect(page.getByRole('button',{name:'Place',exact:true})).toBeVisible();
  expect(await floor()).toEqual([]); // ghost has not mutated the document
  await page.getByRole('button',{name:'Place',exact:true}).click();await ready();
  await page.getByRole('button',{name:'Top',exact:true}).click();
  const original=(await floor())[0];expect(original.part).toBe('rep-nighthawk');
  await page.mouse.move(748,306);await page.mouse.down();await page.mouse.move(785,329);await page.mouse.move(820,355);await page.mouse.up();
  await expect.poll(async()=>JSON.stringify((await floor())[0].position)).not.toBe(JSON.stringify(original.position));
  const moved=(await floor())[0];expect(moved.position.every((n:number)=>n%25===0)).toBe(true);
  await page.keyboard.press('r');await expect.poll(async()=>(await floor())[0].rotation).toBeCloseTo(Math.PI/12);
  await page.getByRole('button',{name:'Undo',exact:true}).click();expect((await floor())[0]).toEqual(moved);
  await page.getByRole('button',{name:'Undo',exact:true}).click();expect((await floor())[0]).toEqual(original); // one undo for the whole drag
  await ready();
  await page.mouse.move(748,306);await page.mouse.down();await page.mouse.move(815,340);await page.keyboard.press('r');await page.keyboard.press('Escape');await page.mouse.up();
  await expect.poll(async()=>JSON.stringify((await floor())[0])).toBe(JSON.stringify(original));
  await expect(page.getByRole('button',{name:'Redo',exact:true})).toBeEnabled();
  await page.mouse.move(748,306);await page.mouse.down();await page.keyboard.down('Alt');await page.mouse.move(779,337);await page.mouse.up();await page.keyboard.up('Alt');
  await expect.poll(async()=>JSON.stringify((await floor())[0].position)).not.toBe(JSON.stringify(original.position));
  expect((await floor())[0].position.some((n:number)=>Math.abs(n/25-Math.round(n/25))>0.001)).toBe(true);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await ready();
  console.log('Drag/rotate/Escape/undo/snap passed');
  await page.getByLabel('Backrest angle',{exact:true}).selectOption('85');
  await page.getByLabel('Seat angle',{exact:true}).selectOption('-15');
  await page.getByLabel('This piece steel finish',{exact:true}).selectOption('stainless');
  await page.getByLabel('Bench frame color',{exact:true}).selectOption('#24528a');
  expect((await floor())[0].params).toEqual({backrestAngle:85,seatAngle:-15});
  await page.getByRole('button',{name:'Reset Backrest angle',exact:true}).click();expect((await floor())[0].params).toEqual({backrestAngle:0,seatAngle:-15});
  await page.getByLabel('Backrest angle',{exact:true}).selectOption('60');
  await page.getByRole('button',{name:'Reset Seat angle',exact:true}).click();expect((await floor())[0].params).toEqual({backrestAngle:60,seatAngle:0});
  expect((await floor())[0].position).toEqual(original.position);expect((await floor())[0].rotation).toBe(original.rotation);
  await page.getByLabel('This piece steel finish',{exact:true}).selectOption('stainless');
  await page.getByRole('button',{name:'Reset bench frame color',exact:true}).click();
  await expect(page.getByLabel('This piece steel finish',{exact:true})).toHaveValue('stainless');
  await page.getByRole('button',{name:'Reset this bench',exact:true}).click();expect((await floor())[0].params).toEqual({backrestAngle:0,seatAngle:0});
  await page.getByLabel('Backrest angle',{exact:true}).selectOption('60');await page.getByLabel('Seat angle',{exact:true}).selectOption('-15');
  console.log('Independent resets passed');
  await page.locator('.config-manager summary').click();await page.getByLabel('Configuration name').fill('Nighthawk browser acceptance');await page.getByRole('button',{name:'Save configuration',exact:true}).click();
  await expect(page.locator('.config-manager summary')).not.toContainText('Unsaved');
  const saved=await floor();await page.reload();await ready();expect(await floor()).toEqual(saved);
  await chooseExport('GLB');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download GLB',exact:true}).click();const download=await pending;
  const bytes=await fs.readFile((await download.path())!);const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const bench=gltf.nodes.find((n:{extras?:{id:string}})=>n.extras?.id===saved[0].id);expect(bench.children).toHaveLength(13);expect(bench.extras.vendorAttribution.vendor).toBe('REP Fitness');
  const sources=bench.children.map((i:number)=>gltf.nodes[i].extras.materialSource);
  expect(sources.filter((s:{role:string;metalness:number})=>s.role==='liner').every((s:{metalness:number})=>s.metalness===0)).toBe(true);
  expect(sources.find((s:{role:string})=>s.role==='fastener').authoredFastenerFinish).toBe(true);
  await chooseExport('3MF');const printPending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download 3MF',exact:true}).click();const printDownload=await printPending;
  const printBytes=await fs.readFile((await printDownload.path())!);await fs.writeFile('/tmp/nighthawk-excluded.3mf',printBytes);
  const archive=unzipSync(printBytes),report=JSON.parse(strFromU8(archive['Metadata/print-report.json']));
  expect(report.excludedInstances).toEqual(['floor-1']);expect(report.instances).toBe(14);
  expect(strFromU8(archive['3D/3dmodel.model'])).not.toContain('rep-nighthawk');
  expect(strFromU8(archive['Metadata/model_settings.config'])).not.toContain('rep-nighthawk');
  console.log('Save/reload, GLB inclusion and 3MF exclusion passed');
  await page.getByRole('button',{name:/Parts list \(/}).click();
  await page.locator('[data-instance-id="floor-1"]').click();
  await page.locator('[data-instance-id="front-left"]').click({modifiers:['Meta']});
  await expect(page.getByRole('heading',{name:'2 parts',exact:true})).toBeVisible();
  await expect(page.getByLabel('Backrest angle',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Close ×',exact:true}).click();
  await page.getByRole('button',{name:'Remove parts',exact:true}).click();await ready();expect(await floor()).toEqual([]);
  await page.getByRole('button',{name:'Undo',exact:true}).click();await ready();expect(await floor()).toEqual(saved);
  await page.getByRole('button',{name:'Top',exact:true}).click();
  await addFromGallery(page,'rep-nighthawk');
  await page.mouse.click(550,320);await ready();expect(await floor()).toHaveLength(2);
  await expect(page.getByText('Bench overlaps the rack footprint.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).click();await ready();expect(await floor()).toEqual(saved);
  // Isolate the actual production geometry for a high-angle mechanical contact review.
  const isolated=await page.evaluate(()=>JSON.parse(localStorage.getItem('bos-strength-configurations-v1')!).configs[0].doc);
  const savedDocument=structuredClone(isolated);
  isolated.removed=Object.keys(isolated.uprights);isolated.accessories=[];
  isolated.floorItems[0].params={backrestAngle:85,seatAngle:20};isolated.floorItems[0].position=[0,0];
  isolated.appearance={overrides:{'floor-1':'#a9232c'}};
  await page.locator('#import-file').setInputFiles({name:'bench-contact-review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(isolated))});
  await ready();await page.getByRole('button',{name:'Side',exact:true}).click();
  await page.locator('canvas[aria-label="Rack assembly: drag to orbit, click a part to edit"]').screenshot({path:'docs/evidence/issue-47/nighthawk-high-angle.png'});
  await page.getByRole('button',{name:'3D',exact:true}).click();
  await page.locator('canvas[aria-label="Rack assembly: drag to orbit, click a part to edit"]').screenshot({path:'docs/evidence/issue-47/nighthawk-high-angle-3d.png'});
  await page.locator('#import-file').setInputFiles({name:'restore-test-rack.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(savedDocument))});await ready();
  } finally {
    // connectOverCDP close disconnects this transport; it does not terminate Chrome.
    await browser.close();
  }
});
