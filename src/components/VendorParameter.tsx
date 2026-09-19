import { isDarko, isVoltra } from '../../rack-generator/vendor-metadata.ts';
import { ResetButton } from './ResetButton.tsx';
const choices: Record<string, readonly (readonly [number, string])[]> = {
 orientation: [[1,'Screen left'],[2,'Screen above'],[3,'Screen right'],[4,'Screen below']],
 pinDiameter: [[15.5,'5/8-inch class · 15.5 mm shaft'],[24.8,'1-inch class · 24.8 mm shaft']],
 finish: [[1,'Textured black powder coat'],[2,'Stainless steel']],
 linerColor: [[1,'Black'],[2,'Red'],[3,'Blue'],[4,'Sand']],
 uprightLiner: [[1,'Included'],[2,'Omitted']],
};
/** Darko/VOLTRA option labels only: registry parts (floor, hang, rack) carry their own `format` labels. */
export function hasVendorParameter(part: string, key: string) { return (isDarko(part) || isVoltra(part)) && Object.hasOwn(choices,key); }
export function VendorParameter({name,label,value,defaultValue,onValue}:{name:string;label:string;value:number;defaultValue:number;onValue:(value:number)=>void}) {
 return <><select aria-label={label} name={name} value={value} onChange={event=>onValue(Number(event.target.value))}>{choices[name].map(([number,text])=><option key={number} value={number}>{text}</option>)}</select><ResetButton label={label} changed={value!==defaultValue} onReset={()=>onValue(defaultValue)}/></>;
}
