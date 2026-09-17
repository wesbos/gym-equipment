import type { PartId } from './types.ts';
export interface VendorAttribution { vendor: string; url: string; credit: string; trademark: string; reconstruction: string }
export const VOLTRA_IDS: PartId[] = ['voltra-sliding','voltra-adaptive','voltra-fixed'];
export const isVoltra = (id: string) => VOLTRA_IDS.includes(id as PartId);
export function vendorAttribution(id: string): VendorAttribution | undefined {
 if (isVoltra(id)) return { vendor: 'Beyond Power', url: 'https://www.beyond-power.com/products/voltra', credit: 'Beyond Power — VOLTRA I', trademark: 'VOLTRA and Beyond Power are trademarks of Beyond Power.', reconstruction: '323 × 139 × 100 mm device envelope. Housing details, magnetic dock and mount interfaces reconstructed from vendor images; estimated dimensions, physical fit unverified.' };
}
