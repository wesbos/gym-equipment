import type { Accessory } from '../../rack-generator/types.ts';
import type { BuilderStore } from '../state/builder-store.ts';
import { isVoltra, vendorAttribution } from '../../rack-generator/vendor-metadata.ts';
export function VendorCredit({part,compact=false}:{part:string;compact?:boolean}) {
 const credit=vendorAttribution(part);
 if(!credit)return null;
 return compact ? <small>{credit.credit}</small> : <div className="note"><a href={credit.url} target="_blank" rel="noreferrer">{credit.credit}</a><p>{credit.trademark}</p><p>{credit.reconstruction}</p></div>;
}
export function VendorControls({store,entry}:{store:BuilderStore;entry:Accessory}) {
 if(!isVoltra(entry.part))return null;
 const change=(key:string,value:number)=>store.act(()=>{const doc=structuredClone(store.getSnapshot().doc);doc.accessories.find(a=>a.id===entry.id)!.params[key]=value;store.commit(doc);});
 return <>
  <label className="field"><span>Device orientation</span><select value={entry.params.orientation??1} onChange={e=>change('orientation',Number(e.target.value))}>{['Screen left','Screen above','Screen right','Screen below'].map((name,i)=><option key={name} value={i+1}>{name}</option>)}</select></label>
  <label className="field"><span>Mounting pin</span><select value={entry.params.pinDiameter??15.5} onChange={e=>change('pinDiameter',Number(e.target.value))}><option value={15.5}>5/8-inch class · 15.5 mm shaft</option><option value={24.8}>1-inch class · 24.8 mm shaft</option></select></label>
  <p className="note">Fit checks use the selected orientation, floor clearance, upright height and generated mounting shafts. Magnetic docking detail is an estimate; no certified physical fit.</p>
 </>;
}
