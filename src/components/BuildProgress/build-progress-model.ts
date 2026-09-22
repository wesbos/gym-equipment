/** Pure pieces of the loading indicator (#218), unit tested in build-progress.test.ts. */
/** Quick rebuilds (one new attachment) finish before this; only slower loads show the indicator. */
export const SHOW_AFTER_MS = 180;

/** What the indicator says: models still generating, then the (main-thread) placement of the finished batch. */
export function progressLabel(progress: { done: number; total: number } | null) {
  if (!progress?.total) return 'Loading…';
  return progress.done < progress.total ? `Loading models · ${progress.done} of ${progress.total}` : 'Placing parts…';
}
/** A mostly new design (a gallery gym, an imported file, the first build) dims the stale canvas under the indicator;
 * a part or two loading while editing only shows the pill. */
export const replacesScene = (progress: { total: number; parts: number } | null, firstBuild: boolean) =>
  firstBuild || (!!progress && progress.total >= 4 && progress.total * 2 >= progress.parts);
