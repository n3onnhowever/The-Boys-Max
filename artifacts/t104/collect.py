"""Explicit frozen queries; max 4 pages/query, sequential requests, 1.2s gap."""
from probe import *
from datetime import timedelta
QUERIES=[
 ('DG-01','2026-09-17','education',None),('DG-02','2026-09-17','theater',None),
 ('DG-03','2026-09-17','entertainment',None),('DG-04','2026-09-19','education',None),
 ('DG-05','2026-09-19','theater',None),('DG-06','2026-09-19','entertainment',None),
 ('DG-07','2026-09-19',None,'true'),('DG-08','2026-09-20','theater',None),
 ('DG-09','2026-09-20','entertainment',None),('DG-12','2026-09-20','theater','true'),
 ('DG-10_11','2026-09-19',None,None)]
def collect():
 manifest=[]
 for task,day,cat,free in QUERIES:
  until=(datetime.fromisoformat(day)+timedelta(days=1)-timedelta(seconds=1)).strftime('%Y-%m-%dT%H:%M:%S')+'+03:00'
  p={'location':'msk','actual_since':day+'T00:00:00+03:00','actual_until':until,'page_size':100,'fields':FIELDS,'expand':'dates,place,location','order_by':'id' if task!='DG-10_11' else '-publication_date','text_format':'text'}
  if cat:p['categories']=cat
  if free:p['is_free']=free
  pages=[];complete=False;seen=[];count=None
  for page in range(1,5 if task!='DG-10_11' else 2):
   name=f'{task}_page_{page}';r,_=fetch(name,'/events/',{**p,'page':page});pages.append(name)
   payload=r.get('payload',{})
   if r['http_status']!=200 or not isinstance(payload.get('results'),list):break
   count=payload.get('count');seen.extend(e.get('id') for e in payload['results'])
   if payload.get('next') is None:
    complete=len(seen)==count and len(set(seen))==len(seen);break
  manifest.append({'task':task,'pages':pages,'complete':complete,'count':count,'received':len(seen),'duplicates':len(seen)-len(set(seen))})
  save('COLLECTION.json',{**meta(),'queries':manifest})
if __name__=='__main__':collect()
