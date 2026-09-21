import { test, expect, chromium, type Page } from '@playwright/test';
import { addFromGallery } from './part-gallery.ts';
import { createAssembly, addAccessory } from '../rack-generator/assembly.ts';
import fs from 'node:fs/promises';

test('isolated reposition: double-click, pair opt-out, floor, rotation, Escape, undo and applied GLB', async () => {
  test.setTimeout(180000);
  // Run against an isolated Vite server (GYM_REPOSITION_BASE_URL, default port 5333) and standalone Chromium CDP.
  if (!process.env.GYM_REPOSITION_CDP_URL) throw Error('Serve the builder on an isolated port (GYM_REPOSITION_BASE_URL, default http://127.0.0.1:5333) and set GYM_REPOSITION_CDP_URL.');
  await fs.mkdir('/tmp/gym-wave4', { recursive: true });
  const browser = await chromium.connectOverCDP(process.env.GYM_REPOSITION_CDP_URL);
  let testPage: Page | undefined;
  try {
    const page = testPage = await browser.contexts()[0].newPage();
    await page.addInitScript(() => localStorage.removeItem("bos-strength-configurations-v1"));
    await page.goto(`${process.env.GYM_REPOSITION_BASE_URL ?? 'http://127.0.0.1:5333'}/builder`);
    page.on('dialog', dialog => dialog.accept());
    // The pixel targets below were authored against a 754x534 canvas. The history timeline strip (#75) now takes
    // 88px under the viewport, so the window is 88px taller to keep that canvas (and every target) the same.
    await page.setViewportSize({ width: 1280, height: 721 });

    // The recovery draft is debounced (AUTOSAVE_DELAY_MS, then idle time, #185): let a pending write land before reading it.
    const doc = async () => await page.evaluate(async () => {
      await new Promise(r => setTimeout(r, 450)); await new Promise(r => requestIdleCallback(() => r(null), { timeout: 1000 })); await new Promise(r => setTimeout(r, 0));
      const c = JSON.parse(localStorage.getItem('bos-strength-configurations-v1') ?? '{}');
      return c.draft ?? c.configs?.find((s: {id:string}) => s.id === c.activeId)?.doc;
    }) ?? createAssembly();
    const load = async (value: unknown) => {
      await page.locator('#import-file').setInputFiles({ name: 'gesture-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
      await ready();
    };
    const ready = async () => {
      if (await page.locator('#export').getAttribute('aria-expanded') !== 'true') await page.locator('#export').click();
      await page.getByRole('menuitemradio', { name: /GLB/ }).click();
      await expect(page.getByRole('button', { name: 'Download GLB', exact: true })).toBeEnabled({ timeout: 30000 });
      await page.keyboard.press('Escape');
    };
    await load(createAssembly());
    await page.getByRole('button', { name: 'Front', exact: true }).click();
    const original = await doc();
    await page.mouse.click(516, 301);
    await expect(page.locator('#placement-hint')).toHaveCount(0);
    await page.mouse.dblclick(516, 301);
    await expect(page.getByLabel('Move pair together')).toBeChecked();
    expect(await doc()).toEqual(original);
    await page.mouse.move(520, 253);
    await page.screenshot({ path: '/tmp/gym-wave4/reposition-pair-ghost.png' });
    await page.mouse.click(520, 253);
    await expect.poll(async () => (await doc()).accessories.find((a:{id:string}) => a.id === 'jhooks-front').target.hole).not.toBe(original.accessories.find((a:{id:string}) => a.id === 'jhooks-front').target.hole);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await ready();
    expect(await doc()).toEqual(original);
    await page.mouse.dblclick(516, 301);
    await page.getByLabel('Move pair together').uncheck();
    await page.mouse.move(520, 253); await page.mouse.click(520, 253); await ready();
    expect((await doc()).accessories.filter((a:{part:string}) => a.part === 'j-hook-standard')).toHaveLength(2);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await ready(); expect(await doc()).toEqual(original);
    // Active preview exports only the applied assembly, with opaque original materials.
    await page.mouse.dblclick(516, 301); await page.mouse.move(520, 253);
    await page.locator('#export').click(); await page.getByRole('menuitemradio', { name: /GLB/ }).click();
    const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download GLB', exact: true }).click();
    const data = await fs.readFile((await (await downloaded).path())!);
    const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
    expect(gltf.materials.every((m:{alphaMode?:string}) => m.alphaMode !== 'BLEND')).toBe(true);
    expect(gltf.nodes.filter((n:{extras?:{ownerId?:string}}) => n.extras?.ownerId === 'jhooks-front')).toHaveLength(2);
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); expect(await doc()).toEqual(original);
    // Structural pickup opens/focuses the move controls, without adding a part.
    await page.mouse.dblclick(520, 230);
    await expect(page.locator('[data-move-control]').first()).toBeFocused();
    expect(await doc()).toEqual(original);
    await page.keyboard.press('Escape');
    // A real orbit drag followed by dblclick must not pick up an item.
    await page.mouse.move(516,301); await page.mouse.down(); await page.mouse.move(535,310); await page.mouse.up();
    await page.mouse.dblclick(535,310); await expect(page.locator('#placement-hint')).toHaveCount(0);
    await addFromGallery(page, 'rep-nighthawk');
    await page.getByRole('button', {name:'Place',exact:true}).click(); await ready();
    await page.getByRole('button', {name:'Top',exact:true}).click();
    await page.screenshot({ path:'/tmp/gym-wave4/reposition-floor-top.png' });
    const floorBefore = await doc();
    await page.mouse.dblclick(748,306);
    await expect(page.locator('#placement-hint')).toBeVisible();
    await page.mouse.move(840,360); await page.keyboard.press('r'); await page.mouse.wheel(0,80);
    expect(await doc()).toEqual(floorBefore);
    await page.keyboard.press('Escape'); expect(await doc()).toEqual(floorBefore);
    await page.mouse.dblclick(748,306); await page.mouse.move(840,360); await page.mouse.click(840,360); await ready();
    expect((await doc()).floorItems[0].position).not.toEqual(floorBefore.floorItems[0].position);
    expect((await doc()).floorItems[0].position.every((n:number) => n % 25 === 0)).toBe(true);
    await page.getByRole('button', {name:'Undo',exact:true}).click(); await ready(); expect(await doc()).toEqual(floorBefore);
    await page.mouse.dblclick(748,306); await page.keyboard.down('Alt'); await page.mouse.move(813,347); await page.mouse.click(813,347); await page.keyboard.up('Alt'); await ready();
    expect((await doc()).floorItems[0].position.some((n:number) => Math.abs(n/25-Math.round(n/25)) > .001)).toBe(true);
    await page.getByRole('button', {name:'Undo',exact:true}).click(); await ready(); expect(await doc()).toEqual(floorBefore);
    console.log('Mounted/floor pickup, snap + Alt, pair opt-out, single undo, Escape, drag exclusion, structure and preview GLB passed');
    let rotating = addAccessory(createAssembly(), 'storage-pin-short', {uprightId:'rear-left',face:'left',hole:10}, false);
    const storageId = rotating.accessories.at(-1)!.id;
    rotating = addAccessory(rotating, 'darko-anchor', {kind:'crossmember-top',connectionId:'left-upper-crossmember',station:4,side:1,uprightId:'front-left',face:'front',hole:0}, false);
    const darkoId = rotating.accessories.at(-1)!.id;
    await load(rotating);
    const rotationBefore = await doc();
    const select = async (id:string) => {
      // Outliner (#206): ⌘-click selects without flying the camera (the zoom checks below compare camera pixels).
      await page.keyboard.press('Escape');
      await page.getByRole('button', {name:/Outliner \(/}).click();
      await page.locator(`#outliner [data-instance-id="${id}"]`).first().click({modifiers:['Meta']});
      await page.getByRole('button', {name:'Close outliner',exact:true}).click();
      await page.mouse.move(850,180);
    };
    await select(storageId);
    const zoomRegion = {x:600,y:240,width:100,height:230};
    const cameraBefore = await page.screenshot({clip:zoomRegion});
    await page.keyboard.press('r'); await page.mouse.wheel(0,80);
    await expect(page.getByRole('button',{name:'Apply rotation',exact:true})).toBeVisible();
    expect(await doc()).toEqual(rotationBefore);
    await page.keyboard.press('Escape'); expect(await doc()).toEqual(rotationBefore);
    const cameraAfter = await page.screenshot({clip:zoomRegion});
    await fs.writeFile('/tmp/gym-wave4/camera-before.png', cameraBefore);
    await fs.writeFile('/tmp/gym-wave4/camera-after.png', cameraAfter);
    const pixelDifference = async (a:Buffer,b:Buffer) => page.evaluate(async ([first,second]) => {
      const pixels = async (data:string) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
        const context=canvas.getContext('2d')!; context.drawImage(image,0,0); return context.getImageData(0,0,image.width,image.height).data;
      };
      const [a,b]=await Promise.all([pixels(first),pixels(second)]);
      let changed=0;
      for(let i=0;i<a.length;i+=4) if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>20) changed++;
      return changed/(a.length/4);
    }, [a.toString('base64'), b.toString('base64')]);
    expect(await pixelDifference(cameraBefore,cameraAfter), 'rotation wheel must not zoom the rack').toBeLessThan(.005);
    await page.mouse.wheel(0,240); // No selected/hovered attachment: ordinary zoom remains available.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await pixelDifference(cameraAfter,await page.screenshot({clip:zoomRegion}))).toBeGreaterThan(.01);
    await select(storageId); await page.mouse.wheel(0,80); await page.keyboard.press('r');
    await page.mouse.click(850,180); await ready();
    expect((await doc()).accessories.find((a:{id:string})=>a.id===storageId).rotation).toBeCloseTo(Math.PI/6);
    await page.getByRole('button',{name:'Undo',exact:true}).click(); await ready(); expect(await doc()).toEqual(rotationBefore);
    await select(darkoId); await page.mouse.wheel(0,80);
    expect(await doc()).toEqual(rotationBefore);
    await page.screenshot({path:'/tmp/gym-wave4/reposition-darko-rotation.png'});
    await page.mouse.move(220,180); // Leaving the viewport commits a rotation-only preview.
    await expect.poll(async()=>(await doc()).accessories.find((a:{id:string})=>a.id===darkoId).rotation).toBeCloseTo(Math.PI);
    await ready(); await page.getByRole('button',{name:'Undo',exact:true}).click(); await ready(); expect(await doc()).toEqual(rotationBefore);
    console.log('Mounted R/wheel staged + click/scroll-out commit, Darko half-turn, Escape and single undo passed');
  } finally {
    try { await testPage?.close({ runBeforeUnload: false }); } finally { await browser.close(); }
  }
});
