// Geometry-analysis helpers: identify independently connected source bodies and
// derive reusable 2D profiles, not display/import source triangle meshes.
export function splitComponents(part) {
 const vertices=part.positions,indices=part.indices,n=vertices.length/3;
 const parent=Array.from({length:n},(_,i)=>i),lookup=new Map();
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 for(let i=0;i<n;i++){const key=vertices.slice(i*3,i*3+3).map(v=>v.toFixed(3)).join(',');if(lookup.has(key))join(i,lookup.get(key));else lookup.set(key,i);}
 for(let i=0;i<indices.length;i+=3){join(indices[i],indices[i+1]);join(indices[i],indices[i+2]);}
 const groups=new Map();
 for(let i=0;i<indices.length;i+=3){const key=find(indices[i]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(...indices.slice(i,i+3));}
 return [...groups.values()].map(triangles=>{const used=[...new Set(triangles)],remap=new Map(used.map((v,i)=>[v,i])),positions=used.flatMap(i=>vertices.slice(i*3,i*3+3)),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){min[k]=Math.min(min[k],positions[i+k]);max[k]=Math.max(max[k],positions[i+k]);}return {positions,indices:triangles.map(i=>remap.get(i)),min,max,size:max.map((v,k)=>v-min[k]),center:max.map((v,k)=>(v+min[k])/2)};}).sort((a,b)=>b.indices.length-a.indices.length);
}
export function projectProfile(api,component,axis=0,tolerance=.02){
 const axes=[0,1,2].filter(a=>a!==axis),triangles=[];
 for(let i=0;i<component.indices.length;i+=3){const poly=component.indices.slice(i,i+3).map(v=>axes.map(a=>component.positions[v*3+a]));const area=(poly[1][0]-poly[0][0])*(poly[2][1]-poly[0][1])-(poly[1][1]-poly[0][1])*(poly[2][0]-poly[0][0]);if(Math.abs(area)>1e-5){if(area<0)poly.reverse();triangles.push(new api.CrossSection([poly]));}}
 const union=api.CrossSection.union(triangles);const clean=union.simplify(tolerance);try{return clean.toPolygons();}finally{clean.delete();union.delete();triangles.forEach(t=>t.delete());}
}
