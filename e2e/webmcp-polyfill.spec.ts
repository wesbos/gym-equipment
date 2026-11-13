import { expect, test } from '@playwright/test';
import type {} from '@w3c/webmcp-polyfill';

test.use({ channel: 'chromium', launchOptions: { args: ['--disable-blink-features=WebMCP', '--use-angle=metal'] } });

test('a browser without WebMCP can discover and use the gym tools', async ({ page }) => {
  await page.addInitScript(() => {
    window.performance.mark('modelContext' in document || 'modelContext' in navigator ? 'native-webmcp' : 'missing-webmcp');
  });
  await page.goto(process.env.GYM_WEBMCP_URL ?? 'http://127.0.0.1:5173');
  expect(await page.evaluate(() => performance.getEntriesByName('missing-webmcp').length)).toBe(1);
  await expect.poll(() => page.evaluate(async () => {
    const tools = await document.modelContext?.getTools();
    return tools?.map(tool => tool.name);
  })).toEqual(expect.arrayContaining(['add_part', 'list_design_parts', 'pan_camera']));

  const addedBike = await page.evaluate(async () => {
    const context = document.modelContext!;
    const tools = await context.getTools();
    async function call(name: string, args: Record<string, unknown>) {
      const tool = tools.find(tool => tool.name === name)!;
      const result = JSON.parse(await context.executeTool(tool, args));
      if (result.isError) throw new Error(result.content[0].text);
      return JSON.parse(result.content[0].text);
    }
    const { added } = await call('add_part', { part: 'rogue-echo-bike', floor_position: [2400, -2000] });
    const bikes = await call('list_design_parts', { query: 'rogue-echo-bike' });
    return bikes.find((bike: { id: string }) => bike.id === added[0])?.part;
  });
  expect(addedBike).toBe('rogue-echo-bike');
  await expect(page.getByRole('log', { name: 'WebMCP calls' })).toContainText('add_part');
});
