import { VendorParameter } from './VendorParameter.tsx';
import { partDefaults } from '../../rack-generator/reset.ts';
import { darkoTopMounts, darkoGuidance } from '../../rack-generator/darko-mounts.ts';
import type { CrossmemberTopTarget } from '../../rack-generator/types.ts';
import type { Accessory } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { isVoltra, isDarko, isDarkoTop, vendorAttribution } from '../../rack-generator/vendor-metadata.ts';
export function VendorCredit({part,compact=false}:{part:string;compact?:boolean}) {
 const credit=vendorAttribution(part);
 if(!credit)return null;
 return compact ? <small>{credit.credit}</small> : <div className="note"><a href={credit.url} target="_blank" rel="noreferrer">{credit.credit}</a><p>{credit.trademark}</p></div>;
}
export function VendorControls({store,entry}:{store:BuilderStore;entry:Accessory}) {
 if(!isVoltra(entry.part) && !isDarko(entry.part))return null;
 const change=(key:string,value:number)=>store.act(()=>{const doc=structuredClone(store.getSnapshot().doc);doc.accessories.find(a=>a.id===entry.id)!.params[key]=value;store.commit(doc);});
 const doc=store.getSnapshot().doc;
 const defaults=partDefaults(doc,entry.part);
 const parameter=(name:string,label:string)=><label className="field"><span>{label}</span><VendorParameter name={name} label={label} value={entry.params[name]??defaults[name]} defaultValue={defaults[name]} onValue={value=>change(name,value)}/></label>;
 const mounts=isDarkoTop(entry.part)?darkoTopMounts(doc):[];
 const key=(t:CrossmemberTopTarget)=>`${t.connectionId}:${t.station}:${t.side}`;
 const setTarget=(value:string,pair=false)=>store.act(()=>{const next=structuredClone(doc),a=next.accessories.find(a=>a.id===entry.id)!,t=mounts.find(m=>m.kind==='crossmember-top'&&key(m)===value)!;if(t.kind!=='crossmember-top')return;const target:CrossmemberTopTarget={kind:t.kind,connectionId:t.connectionId,station:t.station,side:t.side,uprightId:t.uprightId,face:t.face,hole:0};if(pair)a.pairTarget=target;else{a.target=target;delete a.pairTarget;}store.commit(next);});
 if(isDarko(entry.part))return <>
  {entry.target.kind==='crossmember-top' && <>
   <label className="field"><span>Crossmember top / side bolt station</span><select value={key(entry.target)} onChange={e=>setTarget(e.target.value)}>{mounts.map(m=>m.kind==='crossmember-top'&&<option key={key(m)} value={key(m)}>{m.connectorId} · hole {m.station+1} · side {m.side}</option>)}</select></label>
   <label className="field"><span>Matching crossmember pair</span><input type="checkbox" checked={entry.paired} onChange={e=>store.act(()=>{const next=structuredClone(doc);next.accessories.find(a=>a.id===entry.id)!.paired=e.target.checked;store.commit(next);})}/></label>
   {entry.paired&&entry.pairTarget&&<label className="field"><span>Second cradle target</span><select value={key(entry.pairTarget)} onChange={e=>setTarget(e.target.value,true)}>{mounts.map(m=>m.kind==='crossmember-top'&&<option key={key(m)} value={key(m)}>{m.connectorId} · hole {m.station+1} · side {m.side}</option>)}</select></label>}
  </>}
  {parameter('finish','Product finish')}
  {parameter('linerColor','Protective liner')}
  {!isDarkoTop(entry.part)&&parameter('uprightLiner','Upright liner')}
  {parameter('pinDiameter','Mounting shaft')}
  <p className="note">{darkoGuidance(doc)}</p>
 </>;
 return <>
  {parameter('orientation','Device orientation')}
  {parameter('pinDiameter','Mounting pin')}
 </>;
}
