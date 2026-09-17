import trimesh,numpy as np,json,math
from pathlib import Path
from shapely import Polygon,LineString
from shapely.ops import unary_union,polygonize
IDS=['j-hook-standard','j-hook-roller','j-hook-sandwich','spotter-arm','dip-horn','dip-bar-adjustable','landmine','monolift','single-bar-holder','storage-pin-short','storage-pin-long']
def rings(g):
 if g.is_empty:return []
 if g.geom_type=='Polygon':
  from shapely.geometry.polygon import orient
  g=orient(g,1)
  return [[list(map(lambda x:round(float(x),4),p)) for p in list(r.coords)[:-1]] for r in [g.exterior,*g.interiors]]
 return sum([rings(x) for x in g.geoms if x.area>.05],[])
def profile(m,z):
 lines=trimesh.intersections.mesh_plane(m,[0,0,1],[0,0,z]);lines=np.round(lines[:,:,:2],3)
 if not len(lines):return None
 seg=[LineString(l) for l in lines if np.linalg.norm(l[0]-l[1])>.0001]
 ps=list(polygonize(unary_union(seg)));out=[]
 for p in ps:
  q=p.representative_point()
  if sum(Polygon(other.exterior).contains(q) for other in ps)%2:out.append(p)
 return unary_union(out).simplify(.035,preserve_topology=True) if out else None

def frame(c,axis):
 # Recover the exact predominant planar normal, removing the source's tiny rotations.
 ns=c.face_normals;areas=c.area_faces
 alignment=np.abs(ns[:,axis]);eligible=areas>.1
 mask=eligible & (alignment>max(.97,np.max(alignment[eligible])-1e-5))
 if np.any(mask):
  ids=np.where(mask)[0];idx=ids[np.argmax(areas[mask])];n=ns[idx].copy();n*=1 if n[axis]>0 else -1
 else:n=np.eye(3)[axis]
 hint=np.eye(3)[(axis+1)%3];u=hint-n*np.dot(n,hint);u/=np.linalg.norm(u);v=np.cross(n,u)
 return np.array([u,v,n]).T

def project(c):
 ps=[]
 for tri in c.triangles:
  p=Polygon(tri[:,:2])
  if p.area>1e-5:ps.append(p)
 return unary_union(ps).simplify(.035,preserve_topology=True)

allout={}
for id in IDS:
 d=json.load(open(f'rack-generator/reference/decoded/{id}.json'));out=[]
 for part in d['parts']:
  m=trimesh.Trimesh(np.array(part['positions']).reshape(-1,3),np.array(part['indices']).reshape(-1,3)); comps=m.split(only_watertight=False,repair=False)
  for ci,c in enumerate(comps):
   if len(c.faces)<15 or np.min(c.extents)<.15:continue
   name=part['name'];ext=c.extents;counts=[len(np.unique(np.round(c.vertices[:,k],1))) for k in range(3)]
   axis=int(np.argmin(counts))
   if id=='dip-horn' and name=='arms' and ext[0]<150:axis=1
   if (id=='j-hook-roller' and name.startswith('roller')) or (id=='dip-bar-adjustable' and name.startswith('Arm') and ext[1]>400) or (id.startswith('storage-pin') and name.startswith('solid')) or (id=='dip-bar-adjustable' and name.startswith('Tightener')):
    B=frame(c,0 if id.startswith('storage-pin') else 2 if name.startswith('Tightener') else 1);local=c.vertices@B;cx=(local[:,0].min()+local[:,0].max())/2;cy=(local[:,1].min()+local[:,1].max())/2
    rr=np.hypot(local[:,0]-cx,local[:,1]-cy);station={}
    for z,r in zip(local[:,2],rr):
     k=round(float(z),1);station[k]=max(station.get(k,0),float(r))
    coords=[[r,z] for z,r in sorted(station.items())]
    if id.startswith('storage-pin'):
     axial=sorted(station);localmesh=trimesh.Trimesh(local,c.faces,process=False);coords=[]
     for aa,bb in zip(axial,axial[1:]):
      if bb-aa<.015:continue
      for z,e in [(aa,aa+(bb-aa)*.001),(bb,bb-(bb-aa)*.001)]:
       lines=trimesh.intersections.mesh_plane(localmesh,[0,0,1],[0,0,e])
       if len(lines):
        r=float(np.max(np.hypot(lines[:,:,0]-cx,lines[:,:,1]-cy)));coords.append([r,z])
    poly=Polygon([[0,coords[0][1]],*coords,[0,coords[-1][1]]]).buffer(0).simplify(.035)
    out.append({'kind':'revolve','name':name,'basis':np.round(B,9).tolist(),'center':[float(cx),float(cy),0],'rings':rings(poly),'color':part.get('color','#34373c')});continue
   # Long, circular rods/tubes use their principal direction, retaining true round sections.
   evals,evecs=np.linalg.eigh(np.cov(c.vertices.T));n=evecs[:,-1];coords=c.vertices@n
   radiuspoints=c.vertices-np.outer(coords,n);radcenter=radiuspoints.mean(axis=0);rr=np.linalg.norm(radiuspoints-radcenter,axis=1)
   elong=(coords.max()-coords.min())/(np.percentile(rr,95)*2)
   tube_like=elong>4 and np.std(rr)/max(np.mean(rr),1)<.17
   if tube_like:
    candidates=np.where(np.abs(c.face_normals@n)>.99)[0]
    if len(candidates):
     n=c.face_normals[candidates[np.argmax(c.area_faces[candidates])]].copy();n*=1 if n[np.argmax(np.abs(n))]>0 else -1
    hint=np.eye(3)[np.argmin(np.abs(n))];u=np.cross(n,hint);u/=np.linalg.norm(u);v=np.cross(n,u)
    pu,pv=c.vertices@u,c.vertices@v;radcenter=u*(pu.max()+pu.min())/2+v*(pv.max()+pv.min())/2
    coords=c.vertices@n;rr=np.linalg.norm(c.vertices-np.outer(coords,n)-radcenter,axis=1)
    outer=float(np.percentile(rr,99)); inner=float(np.percentile(rr,5));inner=inner if inner<outer*.94 and inner>outer*.5 else 0
    out.append({'kind':'tube','name':name,'r':round(outer,4),'inner':round(inner,4),'a':np.round(radcenter+n*coords.min(),4).tolist(),'b':np.round(radcenter+n*coords.max(),4).tolist(),'color':part.get('color','#34373c')});continue
   B=frame(c,axis);cm=trimesh.Trimesh(c.vertices@B,c.faces,process=False);lo,hi=cm.bounds[:,2];length=hi-lo
   # Remove the long retaining pin from J-hook welded bodies before plate extrusion.
   removed_pin=False
   if id.startswith('j-hook') and name.startswith('solid'):
    # Its actual circular cross section is measured near the free end in source Y.
    from slices import section
    ps=section(c,1,c.bounds[0,1]+20)
    circles=[p for p in ps if 150<p.area<260 and .7<(p.bounds[2]-p.bounds[0])/(p.bounds[3]-p.bounds[1])<1.3]
    if circles:
     cp=circles[0];cx,cz=cp.centroid.coords[0];r=math.sqrt(cp.area/math.pi);ends=[]
     for y in np.arange(c.bounds[0,1]+.5,c.bounds[1,1],.5):
      if any(p.contains(cp.centroid) for p in section(c,1,y)):ends.append(y)
     if ends:
      out.append({'kind':'tube','name':'Retaining pin','r':round(r,4),'inner':0,'a':[cx,min(ends),cz],'b':[cx,max(ends),cz],'color':part.get('color','#34373c')})
      # Strip cylinder triangles from profile source using a radial surface test.
      tri=c.triangles;rad=np.sqrt((tri[:,:,0]-cx)**2+(tri[:,:,2]-cz)**2)
      mask=np.all(rad<r+.35,axis=1)&np.all(tri[:,:,1]<max(ends)+.3,axis=1)
      cm=trimesh.Trimesh(c.vertices@B,c.faces[~mask],process=False);removed_pin=True
   # Machined feature stations: axial faces with significant area, not uniform voxel slices.
   normals=cm.face_normals;areas=cm.area_faces;groups={}
   for k in np.where(np.abs(normals[:,2])>.9999)[0]:
    z=float(cm.triangles_center[k,2]);key=round(z,2);groups[key]=groups.get(key,0)+areas[k]
   cuts=[lo,hi]+[z for z,area in groups.items() if area>max(.5,np.max(ext)**2*.00003) and lo+.02<z<hi-.02]
   cuts=sorted(cuts);merged=[cuts[0]]
   for z in cuts[1:]:
    if z-merged[-1]>.06:merged.append(z)
   if hi-merged[-1]>.01:merged.append(hi)
   # Pure extrusions (including contoured monolift plates) use their entire projected sketch.
   if len(merged)<=2:
    g=project(cm); sketches=[{'z':round(lo,4),'height':round(length,4),'rings':rings(g)}]
   else:
    sketches=[]
    for a,b in zip(merged,merged[1:]):
     if b-a<.035:continue
     g=profile(cm,(a+b)/2)
     if g is None or g.area<.1:continue
     sketches.append({'z':round(a,4),'height':round(b-a,4),'rings':rings(g)})
   if not sketches:
    g=project(cm);sketches=[{'z':round(lo,4),'height':round(length,4),'rings':rings(g)}]
   out.append({'kind':'profiles','name':name,'basis':np.round(B,9).tolist(),'sketches':sketches,'color':part.get('color','#34373c')})
 materials={part['name']:part.get('material','') for part in d['parts']}
 for feature in out:
  material=materials.get(feature['name'],'')
  if 'Rubber' in material or 'uhmw' in feature['name'].lower():
   feature['color']=[.016,.016,.016,1];feature['metalness']=.05345;feature['roughness']=.83418
  elif 'Dark Grey' in material:feature['metalness']=.89960;feature['roughness']=.30188
  elif 'Dark Metal' in material:feature['metalness']=.91168;feature['roughness']=.49533
  elif 'Bright Bolts' in material:feature['metalness']=.85976;feature['roughness']=.35324
 out=[feature for feature in out if not(id=='dip-bar-adjustable' and feature['name']=='Cylinder')]
 allout[id]={'size':d['size'],'reference':d['reference'],'components':out}
 print(id,len(out),sum(len(x.get('sketches',[])) for x in out),flush=True)
json.dump(allout,open('/tmp/attachment-profiles.json','w'),separators=(',',':'))
