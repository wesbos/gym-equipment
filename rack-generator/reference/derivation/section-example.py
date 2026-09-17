import trimesh,json,numpy as np
from shapely import LineString
from shapely.ops import unary_union,polygonize

def section(m,axis,value):
 o=np.zeros(3);o[axis]=value;n=np.zeros(3);n[axis]=1
 lines=trimesh.intersections.mesh_plane(m,n,o)
 axes=[i for i in range(3) if i!=axis]
 lines=np.round(lines[:,:,axes],3)
 polys=list(polygonize(unary_union([LineString(x) for x in lines if np.linalg.norm(x[0]-x[1])>.001])))
 return polys
if __name__=='__main__':
 d=json.load(open('rack-generator/reference/decoded/j-hook-standard.json'));p=d['parts'][1];m=trimesh.Trimesh(np.array(p['positions']).reshape(-1,3),np.array(p['indices']).reshape(-1,3));print(m.bounds)
 for y in np.arange(m.bounds[0,1]+1,m.bounds[1,1],10):
  ps=section(m,1,y);print(round(y,1),[(round(p.area,1),tuple(round(x,1) for x in p.bounds)) for p in ps])
