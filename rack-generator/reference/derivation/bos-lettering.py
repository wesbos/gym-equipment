import sys,json,math
# Requires fontTools; generated contours are also retained alongside this script.
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
font=TTFont(sys.argv[1] if len(sys.argv)>1 else '/Users/wesbos/Library/Fonts/GeistMono-Bold.otf');gs=font.getGlyphSet(); cmap=font.getBestCmap()
class FlatPen(BasePen):
 def __init__(self):super().__init__(gs);self.loops=[];self.cur=[]
 def _moveTo(self,p):self.cur=[list(p)]
 def _lineTo(self,p):self.cur.append(list(p))
 def _curveToOne(self,a,b,c):
  p=self._getCurrentPoint()
  for k in range(1,17):
   t=k/16;u=1-t;self.cur.append([u*u*u*p[j]+3*u*u*t*a[j]+3*u*t*t*b[j]+t*t*t*c[j] for j in range(2)])
 def _qCurveToOne(self,b,c):
  a=self._getCurrentPoint()
  for k in range(1,13):
   t=k/12;u=1-t;self.cur.append([u*u*a[j]+2*u*t*b[j]+t*t*c[j] for j in range(2)])
 def _closePath(self):self.loops.append(self.cur);self.cur=[]
 def _endPath(self):self._closePath()
x=0;loops=[];bridges=[]
for ch in 'BOS STRENGTH':
 name=cmap[ord(ch)];p=FlatPen();gs[name].draw(p)
 translated=[[[q[0]+x,q[1]] for q in l] for l in p.loops];loops+=translated
 if ch in 'BOR':
  points=[q for l in translated for q in l];bridges.append((min(q[0] for q in points)+max(q[0] for q in points))/2)
 x+=font['hmtx'].metrics[name][0]+35
points=[q for l in loops for q in l];xmin=min(q[0] for q in points);xmax=max(q[0] for q in points);ymin=min(q[1] for q in points);ymax=max(q[1] for q in points)
scale=600/(xmax-xmin);cx=(xmax+xmin)/2;cy=(ymax+ymin)/2
result={'loops':[[[round((q[0]-cx)*scale,3),round((q[1]-cy)*scale,3)] for q in l] for l in loops],'bridges':[round((b-cx)*scale,3) for b in bridges]}
json.dump(result,open('/tmp/bos-lettering.json','w'));print('BOS STRENGTH',len(loops),'contours',round((ymax-ymin)*scale,1),'mm high at600mm wide')
