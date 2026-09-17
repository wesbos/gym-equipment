import json,math,collections

def slice_mesh(id,axis,plane):
 d=json.load(open('rack-generator/reference/decoded/'+id+'.json'))['parts'][-1];pos=d['positions'];inds=d['indices']; others=[i for i in range(3) if i!=axis]; edges=[]
 for q in range(0,len(inds),3):
  vs=[pos[inds[q+j]*3:inds[q+j]*3+3] for j in range(3)]; hit=[]
  for j in range(3):
   a,b=vs[j],vs[(j+1)%3]
   if (a[axis]<plane)!=(b[axis]<plane):
    t=(plane-a[axis])/(b[axis]-a[axis]);hit.append(tuple(round(a[k]+t*(b[k]-a[k]),3) for k in others))
  if len(hit)==2 and hit[0]!=hit[1]:edges.append(hit)
 adj=collections.defaultdict(list)
 for a,b in edges:adj[a].append(b);adj[b].append(a)
 used=set();loops=[]
 for a,b in edges:
  if tuple(sorted((a,b))) in used:continue
  loop=[a];prev=a;cur=b;used.add(tuple(sorted((a,b))))
  for k in range(len(edges)+1):
   if cur==a:break
   loop.append(cur);opts=[v for v in adj[cur] if tuple(sorted((cur,v))) not in used]
   if not opts:break
   nxt=opts[0];used.add(tuple(sorted((cur,nxt))));prev,cur=cur,nxt
  if cur==a and len(loop)>2:
   # remove collinear subdivisions
   changed=True
   while changed:
    changed=False;n=[]
    for i,p in enumerate(loop):
     u,v=loop[i-1],loop[(i+1)%len(loop)];cross=(p[0]-u[0])*(v[1]-p[1])-(p[1]-u[1])*(v[0]-p[0]);
     if abs(cross)<0.01:changed=True
     else:n.append(p)
    if len(n)<3:break
    loop=n
   loops.append(loop)
 return loops
if __name__=='__main__':
 for id,ax,plane in [('branded-crossmember',1,0.01),('branded-crossmember-lite',1,0.01),('foot-800',0,0.01),('offset-crossmember',2,80),('upright',2,4)]:
  loops=slice_mesh(id,ax,plane); print(id,len(loops),[(len(l),[round(min(p[k] for p in l),1) for k in range(2)],[round(max(p[k] for p in l),1) for k in range(2)]) for l in loops][:30]);json.dump(loops,open('/tmp/'+id+'-contours.json','w'))
