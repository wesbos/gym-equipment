/** Wall-clock ceiling for single-part build assertions in tests. The ~1.5 s per-part budget in the catalog
 * playbook is a design target measured on an idle machine; tests share CPUs with many parallel runs, so they
 * only catch runaway builds. Override with BUILD_BUDGET_MS. */
export const BUILD_BUDGET_MS = Number(process.env.BUILD_BUDGET_MS) || 15000;
