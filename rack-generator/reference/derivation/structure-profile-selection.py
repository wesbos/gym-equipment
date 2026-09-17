import json
# This records the profile selections used during reconstruction.
# It reads the intermediate /tmp section files from that extraction session.
def bound(l,k):return min(p[k] for p in l),max(p[k] for p in l)
def area(l):return abs(sum(p[0]*l[(i+1)%len(l)][1]-l[(i+1)%len(l)][0]*p[1] for i,p in enumerate(l)))
data={}
data['base']=json.load(open('/tmp/upright-skin.json'))
data['flange']=json.load(open('/tmp/crossmember-425-skin.json'))
data['panelCuts']=[l for l in json.load(open('/tmp/branded-crossmember-0-profile.json')) if bound(l,0)[0]>-520 and bound(l,0)[1]<520 and bound(l,1)[0]>50 and bound(l,1)[1]<225]
data['liteLogo']=[l for l in json.load(open('/tmp/branded-crossmember-lite-36-profile.json')) if bound(l,0)[0]>-100 and bound(l,0)[1]<100]
data['uprightLabels']=[l for l in json.load(open('/tmp/upright-36-profile.json')) if bound(l,0)[0]>25 and bound(l,0)[1]<45]
for id,key in [('foot-800','longFoot'),('foot-400','shortFoot')]:
 skin=json.load(open('/tmp/'+id+'-skin.json'));core=json.load(open('/tmp/'+id+'-20-profile.json'));data[key]={'skin':skin,'core':core,'holes':[[round(sum(bound(l,k))/2,3) for k in range(2)] for l in skin if 16<bound(l,0)[1]-bound(l,0)[0]<18]}
data['offsetRing']=json.load(open('/tmp/offset-crossmember-100-profile.json'))
data['offsetTop']=json.load(open('/tmp/offset-crossmember-skin.json'))

json.dump(data, open('/tmp/structure-profiles.json', 'w'))
