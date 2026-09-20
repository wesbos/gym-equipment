import { test, expect, chromium, devices, type Page } from '@playwright/test';
import { createAssembly } from '../rack-generator/assembly.ts';
import { addFloorItem } from '../rack-generator/floor-items.ts';
import { SHORTCUTS } from '../src/state/shortcuts.ts';

/** Editor power tools (#206): command palette, shortcuts overlay, outliner (select, focus, hide, lock) and clickable
 * warnings, on desktop and an iPhone. Start `npx vite --port 5771` and set GYM_EDITOR_TOOLS_URL=http://127.0.0.1:5771. */
const base = process.env.GYM_EDITOR_TOOLS_URL ?? 'http://127.0.0.1:5771';
const draft = (page: Page) => page.evaluate(() => { const c = JSON.parse(localStorage.getItem('bos-strength-configurations-v1') ?? '{}'); return c.draft ?? c.configs?.find((s: { id: string }) => s.id === c.activeId)?.doc ?? null; });
const ready = (page: Page) => expect(page.locator('#status')).toContainText(/parts/, { timeout: 60000 });

test('editor tools: palette, shortcuts overlay, outliner, hide/lock and clickable warnings', async () => {
  test.setTimeout(240000);
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(20000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => { if (!sessionStorage.getItem('editor-tools-spec')) { localStorage.clear(); sessionStorage.setItem('editor-tools-spec', '1'); } });
    await page.goto(`${base}/`);
    await ready(page);

    // "?" lists every registry shortcut; Escape closes and returns focus.
    await page.locator('body').press('Shift+?');
    const overlay = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('[data-shortcut]')).toHaveCount(SHORTCUTS.length);
    await expect(overlay.locator('[data-shortcut="undo"] kbd')).toHaveText(['⌘', 'Z']);
    await expect(page.locator('.builder-shell')).toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(page.locator('.builder-shell')).not.toHaveAttribute('inert', '');

    // ⌘K: "add rogue echo bike" → Enter starts placement of the Echo Bike.
    await page.keyboard.press('Meta+k');
    const search = page.getByRole('combobox', { name: 'Search actions and parts' });
    await expect(search).toBeFocused();
    await expect(page.getByRole('listbox', { name: 'Actions and parts' }).getByRole('option').first()).toBeVisible();
    await search.fill('add rogue echo bike');
    const first = page.locator('#palette-results [role=option]').first();
    await expect(first).toContainText('Echo Bike');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(search).toHaveAttribute('aria-activedescendant', (await first.getAttribute('id'))!);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
    await expect(page.locator('#placement-hint')).toBeVisible();
    await page.locator('#accept-placement').click();
    await expect.poll(async () => (await draft(page))?.floorItems?.map((i: { part: string }) => i.part)).toEqual(['rogue-echo-bike']);
    await ready(page);
    // Recents first: the bike leads the empty palette.
    await page.keyboard.press('Control+k');
    await expect(page.locator('.cp-section').first()).toHaveText('Recent');
    await expect(page.locator('#palette-results [role=option]').first()).toContainText('Echo Bike');
    // Arrow keys move the active option; a command runs: Top view.
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#palette-results [role=option]').nth(1)).toHaveAttribute('aria-selected', 'true');
    await search.fill('top view');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-view="top"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('1');
    await expect(page.locator('[data-view="iso"]')).toHaveAttribute('aria-pressed', 'true');

    // Outliner: O toggles it; grouped rows; click selects and flies the camera; Shift-click extends.
    await page.keyboard.press('o');
    const outliner = page.locator('#outliner');
    await expect(outliner).toBeVisible();
    await expect(page.locator('#parts-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(outliner.locator('[data-group="group:rack"]')).toContainText('Rack');
    await expect(outliner.locator('[data-group="group:floor"]')).toContainText('Floor');
    const canvas = page.locator('#viewport canvas');
    const before = await canvas.screenshot();
    const bike = outliner.locator('.ol-row[data-instance-id^="floor-"]');
    await bike.click();
    await expect(bike).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(700);
    expect(Buffer.compare(before, await canvas.screenshot())).not.toBe(0);
    const uprights = outliner.locator('.ol-row[data-instance-id]').filter({ hasText: 'upright' });
    await uprights.nth(0).click();
    await uprights.nth(2).click({ modifiers: ['Shift'] });
    await expect(page.locator('#selection-title')).toHaveText('3 parts');
    await uprights.nth(3).click({ modifiers: ['Meta'] });
    await expect(page.locator('#selection-title')).toHaveText('4 parts');

    // Hide and lock are view state: no history entry, nothing saved; ⌘A skips hidden and locked parts.
    const history = await page.locator('.history-timeline').textContent();
    await bike.locator('.ol-eye').click();
    await expect(bike.locator('.ol-eye')).toHaveAttribute('aria-pressed', 'true');
    await expect(outliner.locator('.ol-show-all')).toHaveText('Show all (1)');
    await uprights.nth(0).locator('.ol-lock').click();
    await expect(uprights.nth(0).locator('.ol-lock')).toHaveAttribute('aria-pressed', 'true');
    const total = Number((await page.locator('#parts-toggle').textContent())!.match(/\d+/)![0]);
    await page.locator('#dimensions').click({ force: true });
    await page.keyboard.press('Meta+a');
    await expect(page.locator('#selection-title')).toHaveText(`${total - 2} parts`);
    expect(await page.locator('.history-timeline').textContent()).toBe(history);
    expect(JSON.stringify(await draft(page))).not.toMatch(/"hidden"|"locked"/);
    await page.keyboard.press('Escape');
    // Shortcuts never fire while typing: "h" and "?" in the outliner filter are just text.
    await outliner.locator('.ol-filter').fill('');
    await outliner.locator('.ol-filter').pressSequentially('h?');
    await expect(outliner.locator('.ol-filter')).toHaveValue('h?');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0);
    await outliner.locator('.ol-filter').fill('');
    await page.locator('#dimensions').click({ force: true });
    await page.keyboard.press('Shift+H');
    await expect(outliner.locator('.ol-show-all')).toHaveCount(0);
    await page.keyboard.press('o');
    await expect(outliner).toHaveCount(0);

    // Clickable warnings: two overlapping floor items; the warning selects both and frames them.
    let doc = addFloorItem(addFloorItem(createAssembly(), 'rogue-echo-bike'), 'concept2-rowerg');
    doc = structuredClone(doc); doc.floorItems![1].position = [...doc.floorItems![0].position];
    await page.locator('#import-file').setInputFiles({ name: 'overlap.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
    await ready(page);
    const badge = page.locator('#warnings-button');
    await expect(badge).toBeVisible();
    await badge.click();
    const warning = page.locator('.warnings-popover .warning-item', { hasText: 'Floor items overlap' });
    await warning.click();
    await expect(page.locator('#selection-title')).toHaveText('2 parts');
    await expect(page.locator('#warnings .warning-item', { hasText: 'Floor items overlap' })).toBeVisible();
    // Existing shortcuts still work: Delete removes the selection, ⌘Z brings it back.
    await page.keyboard.press('Delete');
    await expect.poll(async () => (await draft(page))?.floorItems?.length ?? 0).toBe(0);
    await page.keyboard.press('Meta+z');
    await expect.poll(async () => (await draft(page))?.floorItems?.length ?? 0).toBe(2);
    // A big gym (Coop's, 100+ parts): the outliner windows its rows; hang items nest under the pegboard; decor and
    // Plates get their own groups.
    await page.goto(`${base}/?gym=coop-garage-gym-reviews`);
    await expect(page.locator('#parts-toggle')).toHaveText(/Outliner \(1\d\d\)/, { timeout: 60000 });
    await page.locator('body').press('o');
    await expect(page.locator('#outliner')).toBeVisible();
    expect(await page.locator('#outliner [role=treeitem]').count()).toBeLessThan(60);
    await page.locator('.ol-scroller').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(page.locator('#outliner [data-group="group:plates"]')).toBeVisible();
    // The filter keeps matches under their groups: lally posts under Room decor, bands under the pegboard (level 3).
    await page.locator('#outliner .ol-filter').fill('lally');
    await expect(page.locator('#outliner [data-group="group:decor"]')).toBeVisible();
    await page.locator('#outliner .ol-filter').fill('monster band');
    await expect(page.locator('#outliner [role=treeitem][aria-level="3"]', { hasText: 'Monster Band' })).toHaveCount(3);
    expect(errors).toEqual([]);

    // iPhone: the toolbar search button opens the palette as a full-screen sheet; a command runs from it.
    const phone = await browser.newContext({ ...devices['iPhone 14'] });
    const mobile = await phone.newPage();
    await mobile.goto(`${base}/`);
    await ready(mobile);
    await mobile.locator('#open-palette').tap();
    const panel = mobile.getByRole('dialog', { name: 'Command palette' });
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!, viewport = mobile.viewportSize()!;
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(viewport.height - 1);
    await mobile.getByRole('combobox', { name: 'Search actions and parts' }).fill('room settings');
    await mobile.locator('#palette-results [role=option]').first().tap();
    await expect(mobile.locator('#room-button')).toHaveAttribute('aria-pressed', 'true');
    await mobile.locator('#parts-toggle').tap();
    const sheet = mobile.locator('#outliner');
    await expect(sheet).toBeVisible();
    expect(Math.round((await sheet.boundingBox())!.width)).toBe(viewport.width);
    await phone.close();
  } finally {
    await browser.close();
  }
});
