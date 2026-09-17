/** Deterministic rectangle packing. Coordinates are at 1:10; a 1:20 export
 * scales both these placements and its geometry by half. No part is resized. */
export const PRINT_BED = 256;
export const PLATE_ORIGINS = [[0, 0, 0], [307.2, 0, 0]] as const;
export interface PackingBox { size: number[]; name: string }
export interface Placement { x: number; y: number; rotated: boolean }
export function packPlate(boxes: PackingBox[], denominator: 10 | 20): Placement[] {
  const attempt = (bed: number): Placement[] | undefined => {
    let free = [{x:2,y:2,w:bed-2,h:bed-2}];
    const placed: Placement[] = [];
    const order = boxes.map((b,i)=>({ ...b,i })).sort((a,b)=>Math.max(...b.size)-Math.max(...a.size)||a.i-b.i);
    for (const box of order) {
      let best: {index:number;rotated:boolean;w:number;h:number;score:number} | undefined;
      for (const [index,r] of free.entries()) for (const rotated of [false,true]) {
        const w=box.size[rotated?1:0]+2,h=box.size[rotated?0:1]+2;
        if(w<=r.w+1e-8&&h<=r.h+1e-8) {
          const score=Math.min(r.w-w,r.h-h);
          if(!best||score<best.score) best={index,rotated,w,h,score};
        }
      }
      if(!best) return;
      const r=free[best.index],used={x:r.x,y:r.y,w:best.w,h:best.h};
      placed[box.i]={x:r.x,y:r.y,rotated:best.rotated};
      const next:typeof free=[];
      for(const f of free) {
        if(used.x>=f.x+f.w||used.x+used.w<=f.x||used.y>=f.y+f.h||used.y+used.h<=f.y) {next.push(f);continue;}
        if(used.x>f.x) next.push({...f,w:used.x-f.x});
        if(used.x+used.w<f.x+f.w) next.push({...f,x:used.x+used.w,w:f.x+f.w-used.x-used.w});
        if(used.y>f.y) next.push({...f,h:used.y-f.y});
        if(used.y+used.h<f.y+f.h) next.push({...f,y:used.y+used.h,h:f.y+f.h-used.y-used.h});
      }
      free=next.filter((a,i)=>!next.some((b,j)=>i!==j&&a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h&&(j<i||a.x!==b.x||a.y!==b.y||a.w!==b.w||a.h!==b.h)));
    }
    return placed;
  };
  const result=attempt(PRINT_BED) ?? (denominator===20?attempt(PRINT_BED*2):undefined);
  if(!result) throw Error(`Parts cannot be packed on a 256 × 256 mm plate at 1:${denominator}. ${denominator===10?'Choose the smaller 1:20 scale.':'Export fewer parts; no geometry was dropped or individually resized.'}`);
  return result;
}
