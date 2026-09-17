import type { PartDefinition, NumericParams } from '../types.ts';
import { vendorSolid } from './vendor-solid.ts';
import { VOLTRA_IDS, vendorAttribution } from '../vendor-metadata.ts';
export const voltraDefaults = { orientation: 1, pinDiameter: 15.5 };
export function validateVoltra(params: NumericParams) {
 if (!Number.isInteger(params.orientation ?? 1) || (params.orientation ?? 1)<1 || (params.orientation ?? 1)>4) throw Error('VOLTRA orientation must be a quarter turn (1–4).');
 if (![15.5,24.8].includes(params.pinDiameter ?? 15.5)) throw Error('Choose the reconstructed 5/8-inch or 1-inch VOLTRA pin.');
}
export const definitions: PartDefinition[] = VOLTRA_IDS.map(id => ({
 id, name: `Beyond Power VOLTRA I · ${id.slice(7)} mount`, category: 'Digital resistance', defaults: voltraDefaults,
 description: 'VOLTRA I · 323 × 139 × 100 mm · 5–200 lb · 2.6 m cable',
 build: (api, params) => {
  validateVoltra(params);
  const p = {...voltraDefaults,...params}, tube = params.upright ?? 75, pitch = params.mountSpacing ?? 50;
  return vendorSolid(api,s => {
   const {keep:k,add,box,round,cylinder,bolt,M} = s;
   // Rack centre is origin; +Y is outward, mounting pin is at Z0.
   const face = tube/2;
   if (id === 'voltra-sliding') {
    const clamp = k(box([197,157,94],[0,0,0]).subtract(box([tube+4,tube+4,100])));
    add('Sliding split collar',clamp);
    for(const x of [-1,1]) add('Sliding spacer liner',box([2,tube,84],[x*(tube/2+1),0,0]),'liner','#a85134',0,.65);
    add('Hinged collar split',box([7,22,90],[95,-25,0]));
    bolt('Sliding height pin',[0,0,0],p.pinDiameter,217,[0,90,0]);
    add('Tightening knob',cylinder(18,20,[-98,-25,0],[0,90,0],16),'handle');
    add('Safety switch',round(13,24,7,4,[87,face+35,0]),'liner','#c85b36',0,.5);
   } else if (id === 'voltra-adaptive') {
    let plate = k(round(67,165,6,25).rotate([90,0,0]));
    plate = k(plate.translate([0,face+4,-35]));
    const slot = k(k(round(13,64,20,6).rotate([90,0,0])).translate([0,face+4,-63]));
    add('Adaptive slotted plate',k(plate.subtract(slot)));
    bolt('Adaptive through pin',[0,0,0],p.pinDiameter,162);
    add('Adaptive anti-rock pad',box([55,3,34],[0,face+1.5,-82]),'liner');
    add('Adaptive tightening knob',cylinder(14,14,[0,face+16,-82],[90,0,0],20),'handle');
   } else {
    // Two slotted rack bolt stations straddle the dock; sold as a pair, each unit uses one.
    let plate = k(k(round(68,180,5,10).rotate([90,0,0])).translate([0,face+3,0]));
    for(const z of [-pitch,pitch]) {
     const slot = k(k(round(27,45,18,13).rotate([90,0,0])).translate([0,face+3,z]));
     plate = k(plate.subtract(slot)); bolt('Fixed rack bolt',[0,0,z],p.pinDiameter,tube+22);
    }
    add('Fixed slotted steel plate',plate,'source','#989da1',.9,.23);
    add('Fixed raised dock bridge',box([65,16,64],[0,face+13,0]),'source','#989da1',.9,.23);
   }
   const dockY = id === 'voltra-sliding' ? 94 : face+32;
   add('Dock mounting pedestal',cylinder(26,id==='voltra-adaptive'?38:24,[0,id==='voltra-sliding'?82:face+(id==='voltra-adaptive'?20:24),0],[90,0,0]),'source','#90979c',.75,.3);
   add('Device docking receiver',cylinder(36,10,[0,dockY+10,0],[90,0,0]),'source','#7c858a',.7,.3);
   add('Magnetic dock locking rim',k(cylinder(39,16,[0,dockY,0],[90,0,0]).subtract(cylinder(32,18,[0,dockY,0],[90,0,0]))),'source','#bbc0c3',.8,.25);
   add('Magnetic dock insert',cylinder(32,12,[0,dockY,0],[90,0,0]),'source','#181a1c');
   for(const z of [-25,25]) add('Dock latch lug',box([13,7,5],[0,dockY+7,z]),'source','#c3c6c9');
   const start = s.parts.length, bodyY = dockY+52;
   // Main long axis X. 139 mm tall, 100 mm deep including outlet boss.
   const shell = k(k(round(285,139,79,22).rotate([90,0,0])).translate([-19,bodyY,0]));
   add('VOLTRA rounded housing',shell,'source','#d5d8d8',.25,.35);
   add('Housing rear seam',k(k(round(278,132,2,21).rotate([90,0,0])).translate([-19,bodyY-39,0])),'source','#a2a8ac');
   let handle = k(k(round(51,123,26,16).rotate([90,0,0])).translate([136,bodyY-8,0]));
   handle = k(handle.subtract(k(k(round(29,91,30,10).rotate([90,0,0])).translate([136,bodyY-8,0]))));
   add('Integral carry handle',handle,'handle','#d5d8d8',.2,.4);
   add('Touchscreen bezel',k(k(round(89,105,4,5).rotate([90,0,0])).translate([-107,bodyY+40,0])),'source','#747d80');
   add('Touchscreen glass',k(k(round(81,97,2,3).rotate([90,0,0])).translate([-107,bodyY+43,0])),'source','#101a20',.25,.12);
   add('Screen status bar',box([51,1,2],[-107,bodyY+44.5,29]),'source','#95c6b6',0,.4);
   add('Screen resistance readout',box([30,1,12],[-107,bodyY+44.5,5]),'source','#b3c5c8',0,.4);
   add('Outlet mounting bezel',k(k(round(103,112,5,11).rotate([90,0,0])).translate([0,bodyY+40,0])));
   add('Cable outlet annulus',k(cylinder(43,17,[0,bodyY+48,0],[90,0,0]).subtract(cylinder(21,20,[0,bodyY+48,0],[90,0,0]))),'source','#d5d8d8');
   add('Cable aperture',cylinder(20,2,[0,bodyY+51,0],[90,0,0]),'liner','#111314');
   add('Synthetic cable',cylinder(1.5,35,[0,bodyY+69,0],[90,0,0]),'source','#51565a',0,.75);
   add('Connector protective boot',cylinder(12,22,[0,bodyY+91,0],[90,0,0]),'liner','#cfd4d5');
   add('Titanium connector eye',k(k(round(19,32,7,9).subtract(round(9,20,10,4))).translate([0,bodyY+115,0])),'source','#b2b8be',.85,.2);
   for (const x of [-46,46]) for(const z of [-48,48]) bolt('Outlet screw',[x,bodyY+44,z],3.5,5);
   add('USB-C recess',k(k(round(10,4,2,1).rotate([90,0,0])).translate([85,bodyY+40,-41])),'source','#13191c');
   for(let z=-35;z<=35;z+=7) add('Vent grille',box([23,1,2],[87,bodyY+40,z]),'source','#50575a');
   const angle = (p.orientation-1)*90;
   for(let i=start;i<s.parts.length;i++) s.parts[i].solid=k(s.parts[i].solid.rotate([0,angle,0]));
  });
 }
}));
