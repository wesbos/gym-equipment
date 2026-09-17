Promise.race([
(async()=>{
const wait=()=>new Promise(r=>setTimeout(r,150));
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const {createAssembly}=await import('/rack-generator/assembly.ts');
const doc=createAssembly();doc.appearance={frameFinish:'stainless',overrides:{'jhooks-front:left':'#123456','jhooks-front:right':'#abcdef'},finishOverrides:{'jhooks-front:left':'stainless','jhooks-front:right':'clear-grind'}};
const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(doc)],'bulk-finish.json',{type:'application/json'}));const file=document.querySelector('#import-file');file.files=transfer.files;file.dispatchEvent(new Event('change',{bubbles:true}));await wait();
const read=async()=>{let blob;const original=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{blob=b;return original(b)};document.querySelector('#save').click();URL.createObjectURL=original;return JSON.parse(await blob.text());};
if(!document.querySelector('#parts-drawer'))document.querySelector('#parts-toggle').click();await wait();
const ids=['jhooks-front:left','jhooks-front:right'];document.querySelector(`[data-instance-id="${ids[0]}"]`).click();await wait();document.querySelector(`[data-instance-id="${ids[1]}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));await wait();
const finish=()=>document.querySelector('[aria-label="Selected pieces steel finish"]');
assert(finish().value===''&&finish().selectedOptions[0].textContent==='Mixed','Mixed finish missing');
assert(document.querySelectorAll('.paint-swatches [aria-pressed=true]').length===0,'Mixed swatch incorrectly checked');
const setFinish=async value=>{const el=finish();Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('change',{bubbles:true}));await wait();};
await setFinish('stainless');let current=await read();assert(ids.every(id=>current.appearance.finishOverrides[id]==='stainless'),'Bulk steel failed');
document.querySelector('#undo').click();await wait();assert(finish().value==='','Undo did not restore mixed');
document.querySelector('[aria-label="Reset Selected pieces color"]').click();await wait();current=await read();assert(ids.every(id=>!current.appearance.overrides[id])&&current.appearance.finishOverrides[ids[1]]==='clear-grind','Color reset changed finishes');
document.querySelector('#undo').click();await wait();document.querySelector('[aria-label="Reset Selected pieces steel finish"]').click();await wait();current=await read();assert(ids.every(id=>current.appearance.finishOverrides[id]==='stainless'&&current.appearance.overrides[id]),'Finish reset changed colors');
document.querySelector('#undo').click();await wait();document.querySelector('[aria-label="Selected pieces: Red"]').click();await wait();current=await read();assert(ids.every(id=>current.appearance.finishOverrides[id]==='paint'&&current.appearance.overrides[id]==='#a9232c'),'Paint did not override steel');
document.querySelector('#undo').click();await wait();[...document.querySelectorAll('button')].find(e=>e.textContent==='Duplicate parts').click();await wait();current=await read();const copies=[...document.querySelectorAll('[data-instance-id][aria-pressed=true]')].map(e=>e.dataset.instanceId);
assert(copies.length===2,'Missing copied selection');assert(current.appearance.finishOverrides[copies[0]]==='stainless'&&current.appearance.finishOverrides[copies[1]]==='clear-grind','Copied finishes collapsed');assert(current.appearance.overrides[copies[0]]==='#123456'&&current.appearance.overrides[copies[1]]==='#abcdef','Copied colors collapsed');
[...document.querySelectorAll('button')].find(e=>e.textContent==='Use rack appearance').click();await wait();current=await read();assert(copies.every(id=>!current.appearance.overrides[id]&&!current.appearance.finishOverrides[id]),'Combined reset failed');document.querySelector('#undo').click();await wait();current=await read();assert(current.appearance.finishOverrides[copies[1]]==='clear-grind','Reset undo failed');
document.querySelector('#undo').click();await wait();current=await read();assert(current.accessories.length===doc.accessories.length,'Duplicate undo failed');
document.querySelector(`[data-instance-id="${ids[0]}"]`).click();await wait();document.querySelector(`[data-instance-id="${ids[1]}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}));await wait();document.querySelector('.drawer-heading button').click();return {mixed:true,independentResets:true,paintWins:true,duplicateColorsAndFinishes:true,undo:true,copiedIds:copies};
})(),
new Promise((_, reject) => setTimeout(() => reject(Error('Bulk finish browser check exceeded 20 seconds')), 20000)),
])
