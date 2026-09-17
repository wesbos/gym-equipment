import json,trimesh,numpy as np
from shapely import Polygon
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
p=json.load(open('rack-generator/reference/decoded/dip-horn.json'))['parts'][0]
m=trimesh.Trimesh(np.array(p['positions']).reshape(-1,3),np.array(p['indices']).reshape(-1,3));c=min(m.split(only_watertight=False),key=lambda c:len(c.faces))
ids=np.where((np.abs(c.face_normals[:,1])>.99)&(c.area_faces>1))[0];n=c.face_normals[ids[np.argmax(c.area_faces[ids])]].copy();n*=1 if n[1]>0 else -1;u=np.array([0.,0.,1.]);v=np.cross(n,u);B=np.array([u,v,n]).T;local=c.vertices@B
polys=[Polygon(t[:,:2]) for t in local[c.faces]];g=unary_union([p for p in polys if p.area>.001]).simplify(.025);g=orient(g,1)
rings=[[list(map(lambda x:round(float(x),4),p)) for p in list(r.coords)[:-1]] for r in [g.exterior,*g.interiors]]
f='rack-generator/parts/attachments.js';s=open(f).read();a=s.index('const CAD = ')+12;b=s.index(';\nconst names',a);d=json.loads(s[a:b]);w=d['dip-horn']['components'][2];assert w['name']=='arms' and w['kind']=='profiles';w['basis']=np.round(B,9).tolist();w['sketches']=[{'z':round(float(local[:,2].min()),4),'height':round(float(np.ptp(local[:,2])),4),'rings':rings}];s=s[:a]+json.dumps(d,separators=(',',':'))+s[b:];open(f,'w').write(s)
print('Recovered dip horn side wedge',rings)
