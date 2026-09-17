import { darkoTopMounts, darkoGuidance } from '../../rack-generator/darko-mounts.ts';
import type { CrossmemberTopTarget } from '../../rack-generator/types.ts';
import type { Accessory } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { isVoltra, isDarko, isDarkoTop, vendorAttribution } from '../../rack-generator/vendor-metadata.ts';
export function VendorCredit({part,compact=false}:{part:string;compact?:boolean}) {
 const credit=vendorAttribution(part);
 if(!credit)return null;
 return compact ? <small>{credit.credit}</small> : <div className="note"><a href={credit.url} target="_blank" rel="noreferrer">{credit.credit}</a><p>{credit.trademark}</p><p>{credit.reconstruction}</p></div>;
}
export function VendorControls({store,entry}:{store:BuilderStore;entry:Accessory}) {
 if(!isVoltra(entry.part) && !isDarko(entry.part))return null;
 const change=(key:string,value:number)=>store.act(()=>{const doc=structuredClone(store.getSnapshot().doc);doc.accessories.find(a=>a.id===entry.id)!.params[key]=value;store.commit(doc);});
 const doc=store.getSnapshot().doc;
 const mounts=isDarkoTop(entry.part)?darkoTopMounts(doc):[];
 const key=(t:CrossmemberTopTarget)=>`${t.connectionId}:${t.station}:${t.side}`;
 const setTarget=(value:string,pair=false)=>store.act(()=>{const next=structuredClone(doc),a=next.accessories.find(a=>a.id===entry.id)!,t=mounts.find(m=>m.kind==='crossmember-top'&&key(m)===value)!;if(t.kind!=='crossmember-top')return;const target:CrossmemberTopTarget={kind:t.kind,connectionId:t.connectionId,station:t.station,side:t.side,uprightId:t.uprightId,face:t.face,hole:0};if(pair)a.pairTarget=target;else{a.target=target;delete a.pairTarget;}store.commit(next);});
 if(isDarko(entry.part))return <>
  {entry.target.kind==='crossmember-top' && <>
   <label className="field"><span>Crossmember top / side bolt station</span><select value={key(entry.target)} onChange={e=>setTarget(e.target.value)}>{mounts.map(m=>m.kind==='crossmember-top'&&<option key={key(m)} value={key(m)}>{m.connectorId} · hole {m.station+1} · side {m.side}</option>)}</select></label>
   <label className="field"><span>Matching crossmember pair</span><input type="checkbox" checked={entry.paired} onChange={e=>store.act(()=>{const next=structuredClone(doc);next.accessories.find(a=>a.id===entry.id)!.paired=e.target.checked;store.commit(next);})}/></label>
   {entry.paired&&entry.pairTarget&&<label className="field"><span>Second cradle target</span><select value={key(entry.pairTarget)} onChange={e=>setTarget(e.target.value,true)}>{mounts.map(m=>m.kind==='crossmember-top'&&<option key={key(m)} value={key(m)}>{m.connectorId} · hole {m.station+1} · side {m.side}</option>)}</select></label>}
   <p className="note">Top bearing tab follows the selected upper rail. Its retaining bolt passes through the rail’s side hole.</p>
  </>}
  <label className="field"><span>Product finish</span><select value={entry.params.finish??1} onChange={e=>change('finish',Number(e.target.value))}><option value={1}>Textured black powder coat</option><option value={2}>Stainless steel</option></select></label>
  <label className="field"><span>Protective liner</span><select value={entry.params.linerColor??1} onChange={e=>change('linerColor',Number(e.target.value))}>{['Black','Red','Blue','Sand'].map((v,i)=><option key={v} value={i+1}>{v}</option>)}</select></label>
  {!isDarkoTop(entry.part)&&<label className="field"><span>Upright liner</span><select value={entry.params.uprightLiner??1} onChange={e=>change('uprightLiner',Number(e.target.value))}><option value={1}>Included</option><option value={2}>Omitted</option></select></label>}
  <label className="field"><span>Mounting shaft</span><select value={entry.params.pinDiameter??15.5} onChange={e=>change('pinDiameter',Number(e.target.value))}><option value={15.5}>5/8-inch class · 15.5 mm shaft</option><option value={24.8}>1-inch class · 24.8 mm shaft</option></select></label>
  <p className="note">{darkoGuidance(doc)}</p>
 </>;
 return <>
  <label className="field"><span>Device orientation</span><select value={entry.params.orientation??1} onChange={e=>change('orientation',Number(e.target.value))}>{['Screen left','Screen above','Screen right','Screen below'].map((name,i)=><option key={name} value={i+1}>{name}</option>)}</select></label>
  <label className="field"><span>Mounting pin</span><select value={entry.params.pinDiameter??15.5} onChange={e=>change('pinDiameter',Number(e.target.value))}><option value={15.5}>5/8-inch class · 15.5 mm shaft</option><option value={24.8}>1-inch class · 24.8 mm shaft</option></select></label>
  <p className="note">Fit checks use the selected orientation, floor clearance, upright height and generated mounting shafts. Magnetic docking detail is an estimate; no certified physical fit.</p>
 </>;
}
