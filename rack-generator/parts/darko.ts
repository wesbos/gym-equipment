import type { LocalBox, NumericParams, PartDefinition, Vec2 } from '../types.ts';
import { DARKO_IDS, isDarkoTop, vendorAttribution } from '../vendor-metadata.ts';
import { vendorSolid } from './vendor-solid.ts';
import { darkoWordmark } from './vendor-assets/darko-wordmark.ts';
export const darkoDefaults = {pinDiameter:15.5,finish:1,linerColor:1,uprightLiner:1};
export function validateDarko(params: NumericParams) {
 if(![15.5,24.8].includes(params.pinDiameter??15.5))throw Error('Darko mounting shaft must be 15.5 or 24.8 mm.');
 for(const key of ['finish','uprightLiner'])if(![1,2].includes(params[key]??1))throw Error(`Invalid Darko ${key}.`);
 if(![1,2,3,4].includes(params.linerColor??1))throw Error('Invalid Darko liner color.');
}
/** Photo-reconstructed outlines. X across plate, Z up. Origin is rack bolt axis. */
export const anchorOutline: Vec2[] = [
 [-50,18],[-50,-18],[-29,-18],[-29,-115],[-36,-132],[-48,-137],[-83,-119],[-85,-103],[-95,-98],[-105.5,-106],[-105.5,-147],[-94,-159],[0,-210.6],[94,-159],[105.5,-147],[105.5,-106],[95,-98],[85,-103],[83,-119],[48,-137],[36,-132],[29,-115],[29,-18],[50,-18],[50,18]
];
const lowerTier:Vec2[]=[[-29,-175],[-29,-253],[-39,-267],[-50,-269],[-84,-251],[-86,-234],[-97,-230],[-105.5,-238],[-105.5,-280],[-94,-294],[0,-324.9],[94,-294],[105.5,-280],[105.5,-238],[97,-230],[86,-234],[84,-251],[50,-269],[39,-267],[29,-253],[29,-175]];
const topContour=(points:Vec2[])=>points.map(([x,z]):Vec2=>[x,z < -18 ? z+24.25625 : z]);

/** Conservative strips of the physical plate, preserving the open hook mouths.
 * Mounting bores/fasteners are handled by slot conflicts, not bar storage volumes. */
function plateCollisionBoxes(points:Vec2[],minY:number,maxY:number,ceiling=Infinity):LocalBox[]{
 const levels=[...new Set(points.map(p=>Math.min(p[1],ceiling)))].sort((a,b)=>a-b),boxes:LocalBox[]=[];
 for(let i=1;i<levels.length;i++){
  const bottom=levels[i-1],top=levels[i],count=Math.ceil((top-bottom)/10);
  for(let n=0;n<count;n++){
   const low=bottom+(top-bottom)*n/count,high=bottom+(top-bottom)*(n+1)/count,mid=(low+high)/2;
   const edges=points.flatMap((a,j)=>{
    const b=points[(j+1)%points.length];
    if(mid<=Math.min(a[1],b[1])||mid>=Math.max(a[1],b[1]))return [];
    const x=(z:number)=>a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);
    return [{middle:x(mid),low:x(low),high:x(high)}];
   }).sort((a,b)=>a.middle-b.middle);
   for(let j=0;j+1<edges.length;j+=2)boxes.push({min:[Math.min(edges[j].low,edges[j].high),minY,low],max:[Math.max(edges[j+1].low,edges[j+1].high),maxY,high]});
  }
 }
 return boxes;
}
export function darkoTopCollisionBoxes(part:string,tube:number):LocalBox[]{
 const face=tube/2,upper=topContour(anchorOutline),lower=topContour(lowerTier);
 return [
  ...plateCollisionBoxes(upper,face+3.0375,face+7.8),
  ...plateCollisionBoxes(upper.map(([x,z]):Vec2=>[x*.985,z]),face-2.9436,face+3,-55),
  ...(part==='darko-double-decker'?[
   ...plateCollisionBoxes(lower,face+3.0375,face+7.8),
   ...plateCollisionBoxes(lower,face-3.35,face+3),
  ]:[]),
  {min:[-24,face-38,37.5],max:[24,face+4,42.2625]},
  {min:[-24,face,15],max:[24,face+4.7625,39]},
 ];
}
const jOutline:Vec2[]=[[-27,8],[-27,-30],[-42,-43],[-83,-25],[-86,-9],[-99,-4],[-110,-12],[-110,-53],[-99,-63],[-20,-95],[25,-95],[25,8]];
export const definitions:PartDefinition[]=DARKO_IDS.map(id=>({id,name:({'darko-anchor':'Darko Barbell Anchor','darko-dock':'Darko Dock · bare gusset','darko-j':'Darko Dock + J-Anchor','darko-double-j':'Darko Dock + Double J-Anchor','darko-double-decker':'Darko Double Decker Anchor'} as Record<string,string>)[id],category:'Darko Lifting',defaults:darkoDefaults,description:isDarkoTop(id)?`3/16-inch steel · ${id==='darko-anchor'?'9':'13.5'} × 8.3 inches · paired barbell storage`:'3/16-inch steel · 8-inch gusset · modular J-Anchor interface',
 build:(api,params)=>{validateDarko(params);const p={...darkoDefaults,...params},top=isDarkoTop(id),tube=params.upright??75,face=tube/2,steel=p.finish===2?'#a6adb3':'#242529',liner=['#15191c','#c34130','#43769f','#ddd9ca'][p.linerColor-1];
 return vendorSolid(api,s=>{
  const {keep:k,add,plate,box,cylinder,bolt,C}=s;
  const profile=(points:Vec2[],thickness:number,y:number)=>k(k(plate(points,thickness).rotate([90,0,0])).translate([0,y,0]));
  const steelY=face+7.8,linerY=face+3;
  const coat=(name:string,solid:ReturnType<typeof box>)=>add(name,solid,'source',steel,p.finish===2?.85:.5,p.finish===2?.26:.7);
  if(top){
   let body=profile(topContour(anchorOutline),4.7625,steelY);
   if(id==='darko-double-decker')body=k(body.add(profile(topContour(lowerTier),4.7625,steelY)));
   // Main 1-inch hole plus outer 5/8-inch holes at 2-inch spacing.
   for(const x of [-50.8/2,0,50.8/2]) body=k(body.subtract(cylinder(x===0?12.7:7.9375,20,[x,face+4,0],[90,0,0])));
   coat('Laser-cut anchor steel',body);
   const cradle=topContour(anchorOutline).map(([x,z]):Vec2=>[x*.985,z]);
   let pad=profile(cradle,5.9436,linerY);
   pad=k(pad.subtract(box([230,30,90],[0,face,-10])));
   if(id==='darko-double-decker')pad=k(pad.add(profile(topContour(lowerTier),6.35,linerY)));
   add('Protective barbell cradle liner',pad,'liner',liner,0,.65);
   // Folded tab actually bears on the crossmember top at Z37.5.
   coat('Top bearing tab',box([48,42,4.7625],[0,face-17,39.88125]));
   coat('Top bearing tab neck',box([48,4.7625,24],[0,face+2.38125,27]));
   bolt('Crossmember through bolt',[0,0,0],p.pinDiameter,tube+26);
   for(const [x,z] of [[0,-65],[-94,-133],[94,-133],[0,-177],...(id==='darko-double-decker'?[[-94,-266],[94,-266],[0,-300]]:[])])bolt('Cradle liner screw',[x,face+3,z+24.25625],4,14);
  }else{
   let gusset=k(k(s.round(76,203.2,4.7625,8).rotate([90,0,0])).translate([0,steelY,-76.2]));
   const pitch=params.mountSpacing??50;
   for(const z of [0,-2*pitch,-3*pitch])gusset=k(gusset.subtract(cylinder(12.7,20,[0,face+5,z],[90,0,0])));
   for(const z of [-40,-80,-125])gusset=k(gusset.subtract(cylinder(4.2,20,[-24,face+5,z],[90,0,0])));
   coat('Dock modular drilled gusset',gusset);
   if(p.uprightLiner===1){let pad=box([73,3,197],[0,face+1.5,-76.2]);for(const z of [0,-2*pitch,-3*pitch])pad=k(pad.subtract(cylinder(12.7,20,[0,face+2,z],[90,0,0])));add('Optional upright liner',pad,'liner',liner,0,.6);}
   bolt('Dock upper rack bolt',[0,0,0],p.pinDiameter,tube+25);
   bolt('Dock lower rack bolt',[0,0,-2*pitch],p.pinDiameter,tube+25);
   if(id!=='darko-dock')for(const shift of id==='darko-double-j'?[0,-92]:[-55]){
    const outline=jOutline.map(([x,z]):Vec2=>[x,z+shift]);
    let arm=profile(outline,4.7625,steelY+5);
    const screws=[[-23,shift-20],[-23,shift-63],[-96,shift-33]];
    for(const [x,z]of screws)arm=k(arm.subtract(cylinder(2.2,25,[x,face+8,z],[90,0,0])));
    coat('Removable J-Anchor steel',arm);
    add('J-Anchor protective liner',profile(outline,5.94,steelY+11),'liner',liner,0,.65);
    for(const [x,z]of screws)bolt('J-Anchor fixing screw',[x,steelY+4,z],4,17);
   }
  }
  // Official vendor artwork is extruded as closed solids, never a texture.
  const mark=k(k(k(new C(darkoWordmark,'EvenOdd')).scale([42,42])).extrude(.7));
  const positioned=k(k(mark.rotate([90,0,0])).translate([-21,steelY+.8,top?-105:-65]));
  add('Darko Lifting official wordmark',positioned,'source',p.finish===2?'#242529':'#bdc2c5',.6,.35);
  add('Darko Lifting reverse wordmark',k(k(k(mark.rotate([90,0,0])).rotate([0,0,180])).translate([21,(top?face-3.05:p.uprightLiner===1?face-.1:steelY-4.85),top?-105:-65])),'source','#bdc2c5',.6,.35);
 });}
}));
