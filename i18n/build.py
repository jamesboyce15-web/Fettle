import json,re,sys,os
D=os.path.dirname(os.path.abspath(__file__))
keys=json.load(open(D+'/keys_v1.json'))
out={};bad=[]
SETS=[('keys_v1.json',''),('keys_n1.json','2'),('keys_n2.json','3'),('keys_n3.json','4'),('keys_n4.json','5'),('keys_n5.json','6'),('keys_n6.json','7'),('keys_n7.json','8'),('keys_n8.json','9'),('keys_n9.json','10'),('keys_n10.json','11'),('keys_n11.json','12'),('keys_n12.json','13'),('keys_n13.json','14'),('keys_n14.json','15'),('keys_n15.json','16'),('keys_n16.json','17'),('keys_n17.json','18'),('keys_n18.json','19'),('keys_n19.json','20'),('keys_n20.json','21'),('keys_n21.json','22'),('keys_n22.json','23'),('keys_n23.json','24'),('keys_n24.json','25'),('keys_n25.json','26'),('keys_n26.json','27'),('keys_n27.json','28'),('keys_n28.json','29'),('keys_n29.json','30'),('keys_n30.json','31'),('keys_n31.json','32'),('keys_n32.json','33'),('keys_n33.json','34'),('keys_n34.json','35'),('keys_n35.json','36'),('keys_n36.json','37'),('keys_n37.json','38'),('keys_n38.json','39'),('keys_n39.json','40'),('keys_n40.json','41'),('keys_n41.json','42'),('keys_n42.json','43'),('keys_n43.json','44'),('keys_n44.json','45'),('keys_n45.json','46')]
for L in ['pl','ro','pa','ur']:
 out[L]={}
 for kf,suf in SETS:
  keys=json.load(open(D+'/'+kf))
  fn=f'{D}/tr/{L}{suf}.txt'
  if not os.path.exists(fn): continue
  for line in open(fn,encoding='utf8'):
    line=line.rstrip('\n')
    if not line.strip(): continue
    i,t=line.split('|',1); i=int(i); k=keys[i]
    need=set(re.findall(r'\{\d+\}',k)); got=set(re.findall(r'\{\d+\}',t))
    if need-got or got-need: bad.append((L,i,sorted(need-got),sorted(got-need)))
    out[L][k]=t
# sentence-level pairs for runtime fallback
SEN=re.compile(r'(?<=[.!?])\s+(?=[A-Z{"\'\u201c(\u00a30-9])'); TSEN=re.compile(r'(?<=[.!?\u0964\u06d4\u061f\u201d])\s+')
def renum(x):
  idx=[]
  def f(m):
    idx.append(m.group(1)); return '{%d}'%(len(idx)-1)
  return re.sub(r'\{(\d+)\}',f,x),idx
added={}
for L in out:
  extra={}
  for k,t in out[L].items():
    a=SEN.split(k); b=TSEN.split(t)
    if len(a)<2 or len(a)!=len(b): continue
    for ea,tb in zip(a,b):
      ek,idx=renum(ea)
      m={o:str(n) for n,o in enumerate(idx)}
      if set(re.findall(r'\{(\d+)\}',tb))!=set(idx): break
      tt=re.sub(r'\{(\d+)\}',lambda q:'{'+m[q.group(1)]+'}',tb)
      if ek not in out[L]: extra[ek]=tt
  added[L]=len(extra); out[L]={**extra,**out[L]}
print('sentence pairs',added)
p=os.path.join(D,'..','src','fettle.html'); s=open(p,encoding='utf8').read()
js='/*TR-DATA-START*/'+''.join(f'Object.assign(TR.{L},{json.dumps(out[L],ensure_ascii=False)});' for L in out)+'/*TR-DATA-END*/'
s=re.sub(r'/\*TR-DATA-START\*/.*?/\*TR-DATA-END\*/',lambda m:js,s,flags=re.S)
open(p,'w',encoding='utf8').write(s)
print({L:len(out[L]) for L in out},'of',len(keys)); print('placeholder problems:',bad[:30],len(bad))
