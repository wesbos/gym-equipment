import { cableMountTop } from '../system-mounts.ts';
import type { ManifoldAPI, NumericParams, PartDefinition, Vec3 } from '../types.ts';
import { SYSTEM_DEFAULTS, SYSTEM_NAMES, SYSTEM_NOTE, type SystemPartId } from '../system-types.ts';
import { mechanical, type Mechanical } from './system-geometry.ts';
import { validateSystemParams } from '../systems.ts';
const defaults={height:2032,rackWidth:1215.32,depth:1318.4,rearBay:481.4,tube:75,bore:25.4,pitch:50.8,firstHole:65};
function cable(api:ManifoldAPI,p:NumericParams,id:SystemPartId){
  validateSystemParams(id,Object.fromEntries(Object.keys(SYSTEM_DEFAULTS[id]).map(k=>[k,p[k]])));
  if(p.height<1800||p.height>2400||p.depth<400||p.depth>2200||p.rackWidth<1000||p.rackWidth>1400)throw Error('Unsupported cable assembly envelope.');
  return mechanical(api,g=>{
    const kraken=id==='cable-kraken',ares=id.includes('ares'),v2=id==='cable-ares2';
    const height=p.height,mountTop=cableMountTop(p);
    const addedHeight=kraken?0:v2?(height<2200?53.34:22.86):ares?55:45.72;
    const top=height+addedHeight-112;
    const sides=p.sides===3?[-1,1]:[p.sides===1?-1:1];
    for(const side of sides){
      const postX=side*p.rackWidth/2;
      // ARES 2 rotates stacks across the rear bay; original ARES stacks run lengthwise.
      const stackX=ares?postX-side*205:postX;
      const stackY=ares?p.depth-(p.rearBay||p.depth)/2:p.depth-210;
      const lengthwise=kraken||!v2,spacing=180;
      const guide=(n:number,z:number):Vec3=>[stackX+(lengthwise?0:n*spacing/2),stackY+(lengthwise?n*spacing/2:0),z];
      const plateW=lengthwise?130:330,plateD=lengthwise?330:130;
      const guideTop=top+45;
      for(const n of [-1,1]){
        g.add('Polished stack guide rod',g.cylinder(guideTop-125,12.5,'z',guide(n,(guideTop+125)/2)),'rod');
        for(const z of [125,guideTop])g.add('Guide rod socket and rubber bumper',g.ring(35,23,12.7,'z',guide(n,z)),'liner');
      }
      for(const z of [115,top+60]){
        const base=g.rounded(plateW+45,plateD+35,10,[stackX,stackY,z]);
        g.add('Drilled guide support plate',g.cut(base,[-1,1].map(n=>g.cylinder(14,13,'z',guide(n,z)))));
      }
      const count=kraken?20:id==='cable-athena'?(p.upgrade?20:15):(p.upgrade?30:25);
      const plateThickness=ares?22:24,headZ=165+count*(plateThickness+1.5);
      if(p.loading){
        for(let i=0;i<count;i++){
          const z=165+i*(plateThickness+1.5),solid=g.rounded(plateW,plateD,plateThickness,[stackX,stackY,z]);
          const holes=[...[-1,1].map(n=>g.cylinder(plateThickness+2,13,'z',guide(n,z))),g.cylinder(plateThickness+2,12,'z',[stackX,stackY,z]),g.cylinder(plateD+2,4.5,'y',[stackX,stackY,z])];
          g.add(`Weight stack plate ${i+1}`,g.cut(solid,holes),'source');
        }
        g.add('Selector stem with pin stations',g.cut(g.cylinder(headZ-120,9,'z',[stackX,stackY,(headZ+120)/2]),Array.from({length:count},(_,i)=>g.cylinder(22,4,'y',[stackX,stackY,165+i*(plateThickness+1.5)]))),'rod');
        g.add('Magnetic selector pin handle',g.cylinder(28,12,'y',[stackX,stackY-plateD/2-18,270]),'liner');
        g.add('Selector pin',g.cylinder(plateD/2+35,4,'y',[stackX,stackY-plateD/4,270]),'fastener');
        if(p.shroud){for(const sideY of [-1,1]){
          const z=(headZ+150)/2,h=headZ+100;
          const shell=g.box([plateW+30,2,h],[stackX,stackY+sideY*(plateD/2+18),z]);
          const slots=Array.from({length:8},(_,i)=>g.box([plateW-50,6,8],[stackX,stackY+sideY*(plateD/2+18),z-h/2+45+i*35]));
          g.add('Vented folded stack shroud',g.union([g.cut(shell,slots),g.box([2,plateD+38,h],[stackX+plateW/2+16,stackY,z]) ]));
        }}
      }else{
        for(const n of [-1,1])g.add('Plate carriage linear bearing',g.ring(130,23,12.8,'z',guide(n,250)),'sleeve');
        g.add('Plate loaded carriage web',g.box([plateW,plateD-45,10],[stackX,stackY,300]));
        for(const n of [-1,1]){g.add('Olympic loadable weight horn',g.ring(285,25,20,'x',[stackX+n*(plateW/2+142.5),stackY,260]),'sleeve');g.add('Weight horn collar',g.ring(12,38,24,'x',[stackX+n*(plateW/2+6),stackY,260]),'liner');}
      }
      const movingZ=p.loading?headZ+40:330;
      g.add('Stack headplate',g.cut(g.rounded(plateW+8,plateD+8,22,[stackX,stackY,movingZ-30]),[-1,1].map(n=>g.cylinder(26,13,'z',guide(n,movingZ-30)))));
      g.pulley('Moving stack pulley',[stackX,stackY,movingZ],40);
      if(v2){g.add('Incremental weight support',g.box([70,75,8],[stackX+side*120,stackY,movingZ]));for(let i=0;i<2;i++)g.add('Integrated incremental plate',g.box([60,65,12],[stackX+side*120,stackY,movingZ+12+i*14]),'source');}
      // Folded side mounting rails and through-bolts share the actual profile lattice.
      for(const y of [0,p.depth])for(const z of [p.firstHole,mountTop]){
        const rail=g.box([6,p.tube+80,2*p.pitch+40],[postX+side*(p.tube/2+3),y,z+p.pitch]);
        const holes=[0,2].map(n=>g.cylinder(10,p.bore/2,'x',[postX+side*(p.tube/2+3),y,z+n*p.pitch]));
        g.add('Perforated upright mounting flange',g.cut(rail,holes));
        for(const n of [0,2])g.bolt('Rack mounting bolt', [postX,y,z+n*p.pitch],p.bore-0.8,p.tube+38);
      }
      for(const z of [p.firstHole+40,top+35]){
        const beam=g.box([70,p.depth,6],[postX, p.depth/2,z]);
        const folded=g.union([beam,g.box([6,p.depth,45],[postX+side*32,p.depth/2,z+20])]);
        const holes=Array.from({length:Math.floor((p.depth-50)/p.pitch)},(_,i)=>g.cylinder(80,7,'z',[postX,25+i*p.pitch,z]));
        g.add('Folded perforated pulley rail',g.cut(folded,holes));
      }
      const trolleyX=postX+(v2?side*75:ares?-side*10:0),ty=-p.tube/2-70,tz=p.trolley;
      const housing=g.box([p.tube+20,p.tube+20,175],[postX,0,tz]);
      g.add('Sliding trolley steel sleeve',g.cut(housing,[g.box([p.tube+9,p.tube+9,180],[postX,0,tz])]));
      g.add('Trolley UHMW lining',g.cut(g.box([p.tube+9,p.tube+9,169],[postX,0,tz]),[g.box([p.tube+1,p.tube+1,175],[postX,0,tz])]),'liner');
      g.bolt('Trolley locking pin',[postX,0,tz],Math.min(14,p.bore-0.8),p.tube+35,'y');
      g.add('Trolley pop pin knob',g.cylinder(35,19,'y',[postX,p.tube/2+30,tz]),'liner');
      g.add('Trolley adjustment handle',g.path([[postX+side*60,20,tz+60],[postX+side*110,20,tz+60],[postX+side*110,20,tz-60],[postX+side*60,20,tz-60]],9),'handle');
      g.add('Trolley swivel clevis',g.box([Math.abs(trolleyX-postX)+30,75,8],[(trolleyX+postX)/2,-p.tube/2-25,tz-50]));
      const outputs=kraken?[-30,30]:[0];
      for(const [i,dx] of outputs.entries()){
        const dz=0,outputX=trolleyX+dx;
        const wheel:Vec3=[outputX,ty,tz];g.pulley(`Swivel cable output ${i+1}`,wheel,40);
        g.add('Swivel vertical pivot',g.cylinder(90,10,'z',[outputX,ty+40,tz+dz]),'rod');
        const upper:Vec3=[postX,p.depth-55,top+60],front:Vec3=[outputX,ty,top+60];
        g.pulley(`Upper rear redirect ${i+1}`,[upper[0]+i*45,upper[1],upper[2]],45);
        g.pulley(`Upper front redirect ${i+1}`,front,45);
        // Piecewise tangent runs and sampled wraps are true watertight cable solids.
        const path:Vec3[]=[[stackX,stackY+40,movingZ],[stackX,stackY+40,top+60]];
        for(let j=0;j<=12;j++){const a=Math.PI-j*Math.PI/12;path.push([outputX,ty+45*Math.cos(a),top+60+45*Math.sin(a)]);}
        path.push([outputX,ty+40,tz+dz]);
        for(let j=0;j<=12;j++){const a=-j*Math.PI/12;path.push([outputX,ty+40*Math.cos(a),tz+dz+40*Math.sin(a)]);}
        path.push([outputX,ty-60,tz+dz-70]);
        g.add(`Static cable output ${i+1}`,g.path(path,2.4),'liner');
        g.handle(`Cable handle ${i+1}`,[outputX,ty-60,tz+dz-90]);
      }
      // Return circuit, lower redirect and floating equalizer documented in manuals.
      const lowZ=p.firstHole+90,returnX=postX-side*55;
      g.pulley('Lower front return',[returnX,ty,lowZ],40);
      g.pulley('Lower stack return',[stackX,stackY,lowZ],40);
      g.pulley('Floating equalizer upper',[stackX-side*65,stackY,1100],35);
      g.pulley('Floating equalizer lower',[stackX-side*65,stackY,1005],35);
      g.add('Floating equalizer link',g.box([6,35,160],[stackX-side*65-20,stackY,1052]));
      g.add('Lower return static cable',g.path([[returnX,ty+40,tz],[returnX,ty+40,lowZ],[returnX,ty,lowZ-40],[stackX,stackY,lowZ-40],[stackX,stackY+40,lowZ],[stackX,stackY+40,movingZ]],2.4),'liner');
      g.add('Stack sheave returning cable',g.path([[stackX,stackY-40,top+55],[stackX,stackY-40,movingZ],[stackX,stackY,movingZ-40],[stackX,stackY+40,movingZ]],2.4),'liner');
      if(kraken&&p.adapter)g.add('1:1 dual-output combiner',g.profile([[-65,0],[-40,-35],[40,-35],[65,0]],6,[trolleyX,ty-65,tz-150],'y'),'handle');
      if(ares){
        const z=v2?375:150,y=p.depth-(p.rearBay||p.depth)+40;
        g.pulley('Low row swivel',[side*90,y,z],40,'y');
        g.pulley('Lat pulldown swivel',[side*90,y,top+65],40,'y');
        g.add('Lat and row cable circuit',g.path([[stackX,stackY,movingZ+45],[stackX,stackY,top+105],[side*90,y,top+105],[side*90,y,top-70]],2.4),'liner');
        g.add('Low row cable return',g.path([[stackX,stackY,165],[stackX,y,165],[side*90,y,165],[side*90,y-45,z],[side*90,y-90,z]],2.4),'liner');
      }
    }
    if(ares){
      for(const z of [p.firstHole+45,top+50]){
        const y=p.depth-(p.rearBay||p.depth)/2;
        const rail=g.box([p.rackWidth,75,75],[0,y,z]);
        const hollow=g.box([p.rackWidth+2,69,69],[0,y,z]);
        g.add('ARES transverse stack support',g.cut(rail,[hollow]));
      }
      const y=p.depth-(p.rearBay||p.depth)+25,z=v2?320:130;
      for(const side of [-1,1]){
        const plate=g.box([220,10,240],[side*200,y,z]);const slots=Array.from({length:7},(_,i)=>g.box([190,14,7],[side*200,y,z-90+i*30]));
        g.add('Slotted low row footplate',g.rotate(g.cut(plate,slots),[0,0,0]));
        g.add('Footplate brace',g.profile([[0,0],[150,0],[0,210]],8,[side*200,y,z-120],'x'));
      }
      if(p.handles){g.add('Bent lat bar',g.path([[-570,y,top-170],[-440,y,top-90],[440,y,top-90],[570,y,top-170]],14),'handle');g.handle('Low row handle',[0,y-110,z+40]);}
    }
  });
}
export const definitions:PartDefinition[]=(['cable-kraken','cable-ares2','cable-athena','cable-ares1'] as const).map(id=>({id,name:SYSTEM_NAMES[id],category:'Cable systems',defaults:{...defaults,...SYSTEM_DEFAULTS[id],...(id==='cable-kraken'?{height:2133.6,tube:76.2,rackWidth:1168.4,depth:838.2,rearBay:0}: {})},description:SYSTEM_NOTE,build:(api,p)=>cable(api,p,id)}));
