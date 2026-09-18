import { test, expect, chromium, type Page } from '@playwright/test';
import { createAssembly, resizeAssembly, addAccessory } from '../rack-generator/assembly.ts';
import { DocumentHistory } from '../src/state/history.ts';
import type { ConfigCollection } from '../src/state/config-storage.ts';

/** Uses the real CAD worker and renderer in an isolated headed Metal browser. */
test('full timeline: 30+ edits, pointer scrubbing, replay, restoration, persistence and applied-only exports', async () => {
  test.setTimeout(240000);
  const browser = process.env.GYM_TIMELINE_CDP_URL
    ? await chromium.connectOverCDP(process.env.GYM_TIMELINE_CDP_URL)
    : await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=metal'] });
  let testPage: Page | undefined;
  try {
    const context = browser.contexts()[0] ?? await browser.newContext({ acceptDownloads: true });
    const page = testPage = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('http://127.0.0.1:5341');
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://127.0.0.1:5341/builder');
    page.on('dialog', dialog => dialog.accept());
    const snapshot = async () => {
      const collection = await page.evaluate(() => JSON.parse(localStorage.getItem('bos-strength-configurations-v1') ?? '{}')) as ConfigCollection;
      const saved = collection.configs?.find(config => config.id === collection.activeId);
      const applied = collection.draft ?? saved?.doc ?? createAssembly();
      const history = collection.draftTimeline ?? saved?.timeline;
      const position = Number(await page.getByRole('slider', { name: 'History playhead' }).getAttribute('aria-valuenow'));
      return { applied, timeline: { entries: history?.events ?? [], latest: history?.events.length ?? 0,
        applied: history?.applied ?? 0, position, viewing: position !== (history?.applied ?? 0) } };
    };
    const ready = () => expect(page.locator('#status')).toHaveText(/(?:parts · All connections aligned|placement warnings? · .* parts)/, { timeout: 90000 });
    const slider = page.getByRole('slider', { name: 'History playhead' });
    await ready();
    console.log('Initial production rack built');
    const initial = await snapshot();
    const initialDimensions = await page.locator('#dimensions').innerText();
    expect(initial.timeline.latest).toBe(0);
    // Real sidebar inputs make 32 separate commits, each represented by a marker.
    for (let i = 0; i < 32; i++) await page.getByRole('button', { name: i % 2 ? 'Rack: Blue' : 'Rack: Red', exact: true }).click();
    await expect(slider).toHaveAttribute('aria-valuemax', '32');
    await ready();
    // Import two deterministic normal rack edits through the public JSON UI.
    const resize = resizeAssembly((await snapshot()).applied, { height: 2540 });
    await page.locator('#import-file').setInputFiles({ name: 'resize.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(resize)) });
    const added = addAccessory(resize, 'storage-pin-short', { uprightId: 'rear-left', face: 'left', hole: 10 }, false);
    await page.locator('#import-file').setInputFiles({ name: 'add.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(added)) });
    await ready();
    console.log('32 color commits + resize/add imports built');
    const live = await snapshot(), last = live.timeline.latest;
    expect(last).toBeGreaterThan(32);
    expect(live.applied.accessories.length).toBe(initial.applied.accessories.length + 1);
    // Pointer movement must update the playhead while held, then settle on the newest request.
    const bounds = (await slider.boundingBox())!;
    await page.mouse.move(bounds.x + last * 28 + 14, bounds.y + 20);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 14, bounds.y + 20, { steps: 12 });
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await ready();
    await expect(page.locator('#dimensions')).toHaveText(initialDimensions);
    await page.mouse.move(bounds.x + last * 28 + 14, bounds.y + 20, { steps: 12 });
    await page.mouse.up();
    await expect(slider).toHaveAttribute('aria-valuenow', String(last));
    await ready();
    expect((await snapshot()).applied).toEqual(live.applied);
    await page.locator(`[data-step="${last}"]`).hover();
    await expect(page.locator(`[data-step="${last}"]`)).toHaveAttribute('title', /.+/);
    await slider.focus(); await page.keyboard.press('Home');
    await expect(page.locator('.timeline-position')).toContainText('Viewing history');
    console.log('Pointer scrub back/forward verified');
    // Export JSON preserves the applied rack, even when the preview is the initial design.
    const downloadEvent = page.waitForEvent('download'); await page.locator('#save').click();
    const download = await downloadEvent;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const exportedText = Buffer.concat(chunks).toString();
    expect(JSON.parse(exportedText).doc).toEqual(live.applied);
    await page.locator('#export').click();
    await page.getByRole('menuitemradio', { name: /GLB/ }).click();
    await expect(page.getByRole('button', { name: 'Download GLB', exact: true })).toBeDisabled();
    await expect(page.getByText('Return to latest to export the applied rack.', { exact: false })).toBeVisible();
    await page.keyboard.press('Escape');
    // Input shortcuts retain focus and never navigate history.
    await page.getByLabel('Search parts').fill('hook');
    await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft');
    await expect(page.getByLabel('Search parts')).toBeFocused();
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await page.getByLabel('Search parts').fill('');
    // Editing an old preview must retain the latest part and dimensions.
    await page.getByRole('button', { name: 'Rack: Green', exact: true }).click();
    const edited = await snapshot();
    expect(edited.timeline.viewing).toBe(false);
    expect(edited.applied.accessories).toEqual(live.applied.accessories);
    expect(edited.applied.rack).toEqual(live.applied.rack);
    expect(edited.applied.appearance.frameColor).toBe('#24513c');
    await slider.focus(); await page.keyboard.press('Home');
    await page.getByRole('button', { name: 'Restore to here', exact: true }).click();
    expect((await snapshot()).applied).toEqual(initial.applied);
    await slider.focus(); await page.keyboard.press('Meta+z');
    expect((await snapshot()).applied).toEqual(edited.applied);
    await page.keyboard.press('Meta+Shift+z');
    expect((await snapshot()).applied).toEqual(initial.applied);
    await page.keyboard.press('Meta+z');
    console.log('Applied-only export and old-view edit/restore/undo verified');
    await page.getByRole('button', { name: 'Play history', exact: true }).click();
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect.poll(async () => Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(1);
    console.log('Replay advanced through multiple built steps');
    await page.getByRole('button', { name: 'Pause history', exact: true }).click();
    const paused = (await snapshot()).timeline.position;
    await page.waitForTimeout(600);
    expect((await snapshot()).timeline.position).toBe(paused);
    await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
    await ready();
    await page.getByText('Configurations', { exact: false }).first().click();
    await page.getByLabel('Configuration name').fill('Timeline acceptance');
    await page.getByRole('button', { name: 'Save configuration', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save configuration', exact: true })).toBeEnabled();
    console.log('Playback pause + named save verified');
    const saved = await snapshot();
    await page.reload(); await ready();
    expect((await snapshot()).timeline.entries).toEqual(saved.timeline.entries);
    expect((await snapshot()).applied).toEqual(saved.applied);
    await slider.focus(); await page.keyboard.press('Home');
    await ready();
    await expect(page.locator('#dimensions')).toHaveText(initialDimensions);
    console.log('Saved timeline reload + old-step scene dimensions verified');
    // A staged part preview is canceled by history navigation, with no late ghost commit.
    await page.getByRole('button', { name: 'Return to latest', exact: true }).click();
    await page.locator('[data-part="j-hook-standard"]').click();
    await expect(page.locator('#placement-hint')).toBeVisible();
    await slider.focus(); await page.keyboard.press('Home');
    await expect(page.locator('#placement-hint')).toHaveCount(0);
    await page.keyboard.press('End'); await ready();
    await page.screenshot({ path: '/tmp/gym-wave5-timeline.png' });
    // Saved envelope can also round-trip through the JSON UI.
    await page.locator('#import-file').setInputFiles({ name: 'history.json', mimeType: 'application/json', buffer: Buffer.from(exportedText) });
    await expect(slider).toHaveAttribute('aria-valuemax', String(last));
    expect((await snapshot()).applied).toEqual(live.applied);
    await page.getByRole('button', { name: 'Clear history', exact: true }).click();
    await page.getByRole('button', { name: 'Erase history', exact: true }).click();
    await expect(slider).toHaveAttribute('aria-valuemax', '0');
    expect((await snapshot()).applied).toEqual(live.applied);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    console.log(`Verified ${last} changes, live pointer scrub, applied-only JSON/GLB guard, old-view edit, restore/undo/redo, replay/pause, saved reload, JSON round-trip and clear.`);
  } finally {
    await testPage?.close();
    await browser.close();
  }
});


test('3MF availability follows the applied rack, including empty historical views', async () => {
  test.setTimeout(90000);
  const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=metal'] });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto('http://127.0.0.1:5341/builder');
    const full = createAssembly();
    const empty = { ...full, accessories: [], removed: [...Object.keys(full.uprights), ...full.connections.map(edge => edge.id)] };
    const history = new DocumentHistory(empty);
    history.append(full);
    const load = async (doc: typeof full) => page.locator('#import-file').setInputFiles({
      name: 'empty-history.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: 'bos-strength-session', version: 1, doc, timeline: history.data })),
    });
    await load(full);
    const slider = page.getByRole('slider', { name: 'History playhead' });
    await slider.focus(); await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('#parts-toggle')).toHaveText('Parts list (0)');
    await page.locator('#export').click();
    await page.getByRole('menuitemradio', { name: /3MF/ }).click();
    await expect(page.getByRole('button', { name: 'Download 3MF', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    history.append(empty);
    await load(empty);
    await slider.focus(); await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('#parts-toggle')).not.toHaveText('Parts list (0)');
    await page.locator('#export').click();
    await page.getByRole('menuitemradio', { name: /3MF/ }).click();
    await expect(page.getByRole('button', { name: 'Download 3MF', exact: true })).toBeDisabled();
  } finally { await browser.close(); }
});
