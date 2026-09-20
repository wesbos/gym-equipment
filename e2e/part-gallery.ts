/** Shared e2e helpers for the parts gallery (#183): parts are added from the gallery overlay, not the sidebar. */
import { expect, type Page } from '@playwright/test';

/** Opens the gallery (unless it is open) and types a search. */
export async function openGallery(page: Page, query = '') {
  if (!(await page.locator('.part-gallery').count())) {
    // Phones (#203) open the gallery from the top bar; the sidebar launcher lives in the sheet's Parts tab.
    const phone = /^phone/.test(await page.locator('.builder-page').getAttribute('data-layout') ?? '');
    await page.locator(phone ? '.toolbar-add' : '#open-gallery').click();
  }
  await expect(page.locator('#gallery-search')).toBeFocused();
  await page.locator('#gallery-search').fill(query);
}
/** Finds a part card in the gallery (searching its id words by default) and clicks it: the usual placement flow
 * starts and the gallery closes. */
export async function addFromGallery(page: Page, part: string, query = part.replaceAll('-', ' ')) {
  await openGallery(page, query);
  await page.locator(`.part-gallery [data-part="${part}"]`).click();
  await expect(page.locator('.part-gallery')).toHaveCount(0);
}
