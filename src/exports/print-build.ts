import type { ManifoldAPI, NumericParams, SolidPart } from '../../rack-generator/types.ts';
/** Preserve the resolved logo payload without duplicating its validation/type.
 * Works with today's two-argument builders and the logo stream's optional third
 * ValidatedLogo argument. resolveAssembly remains the validation/site boundary.
 */
export function buildPrintInstance<Logo>(
  api: ManifoldAPI,
  definition: { defaults: NumericParams; build: (api: ManifoldAPI, params: NumericParams, logo?: Logo) => SolidPart[] },
  instance: { params: NumericParams; logo?: Logo },
): SolidPart[] {
  return definition.build(api, { ...definition.defaults, ...instance.params }, instance.logo);
}
