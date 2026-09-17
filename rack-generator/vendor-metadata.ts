import type { PartId } from './types.ts';
export interface VendorAttribution { vendor: string; url: string; credit: string; trademark: string; reconstruction: string }
export const VOLTRA_IDS: PartId[] = ['voltra-sliding','voltra-adaptive','voltra-fixed'];
export const isVoltra = (id: string) => VOLTRA_IDS.includes(id as PartId);
export const DARKO_IDS: PartId[] = ['darko-anchor','darko-dock','darko-j','darko-double-j','darko-double-decker'];
export const isDarko = (id: string) => DARKO_IDS.includes(id as PartId);
export const isDarkoTop = (id: string) => id === 'darko-anchor' || id === 'darko-double-decker';
export function vendorAttribution(id: string): VendorAttribution | undefined {
 if (id === 'rep-nighthawk') return {vendor:'REP Fitness',url:'https://repfitness.com/products/rep-nighthawk-adjustable-bench',credit:'REP Fitness — Nighthawk AB-4102',trademark:'REP and Nighthawk are trademarks of REP Fitness.',reconstruction:'Independent Manifold reconstruction from published envelope, angles, official drawings and photos. Secondary frame sections and internals estimated; scenery only, excluded from print export.'};
 if (isDarko(id)) return {vendor:'Darko Lifting',url:'https://darkolifting.com/products/'+(id==='darko-anchor'?'the-barbell-anchor':id==='darko-double-decker'?'double-decker-barbell-anchor':'the-dock'),credit:'Darko Lifting — darkolifting.com · Designed & fabricated in USA',trademark:'Darko Lifting® products shown with credit; designs © Darko Lifting',reconstruction:'Photo-reconstructed plate outlines, liners and interfaces; published steel thickness and overall heights. Hole datum, bend, cradle and fastener details estimated. Physical fit unverified; no load-bearing certification.'};
 if (isVoltra(id)) return { vendor: 'Beyond Power', url: 'https://www.beyond-power.com/products/voltra', credit: 'Beyond Power — VOLTRA I', trademark: 'VOLTRA and Beyond Power are trademarks of Beyond Power.', reconstruction: '323 × 139 × 100 mm device envelope. Housing details, magnetic dock and mount interfaces reconstructed from vendor images; estimated dimensions, physical fit unverified.' };
}
