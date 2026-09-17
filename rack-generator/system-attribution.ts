import type { AttributionResolver } from './catalog-contract.ts';
import { isSystemPart, SYSTEM_NOTE } from './system-types.ts';
/** Product credits travel with exports; source BOS nameplates remain unchanged. */
export const systemAttribution: AttributionResolver = part => {
  if (!isSystemPart(part)) return undefined;
  const bos = part === 'cable-kraken';
  return {
    vendor: bos ? 'Bells of Steel' : 'REP Fitness',
    url: bos ? 'https://bellsofsteel.com/collections/all/products/kraken-4-post-hydra-manticore' :
      part === 'smith-rep' ? 'https://repfitness.com/products/smith-machine-rack-attachment' :
      part === 'cable-athena' ? 'https://repfitness.com/products/athena-selectorized-side-mount-functional-trainer' :
      part === 'cable-ares1' ? 'https://repfitness.com/products/ares-cable-attachment' :
      'https://repfitness.com/products/ares-2-0-cable-attachment',
    credit: 'Independent reconstruction from manufacturer specifications and assembly manuals.',
    trademark: bos ? 'Kraken, Hydra and Manticore are Bells of Steel product names.' : 'ARES, Athena and REP are REP Fitness product names.',
    reconstruction: SYSTEM_NOTE,
  };
};
