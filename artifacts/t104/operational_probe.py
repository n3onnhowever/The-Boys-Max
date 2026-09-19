"""Bounded operational checks; no retries or rate-limit induction."""
from probe import *
import re
from html import unescape
if __name__=='__main__':
 p={'location':'msk','actual_since':'2026-09-19T00:00:00+03:00','actual_until':'2026-09-19T23:59:59+03:00','categories':'education','page_size':2,'fields':FIELDS,'expand':'dates,place,location','order_by':'id'}
 for name,page in [('pagination_1',1),('pagination_2',2),('pagination_1_repeat',1)]:fetch(name,'/events/',{**p,'page':page})
 for name,since,until in [('actual_overlap','2026-09-19T18:00:00+03:00','2026-09-19T18:01:00+03:00'),('actual_after_end','2026-10-01T00:00:00+03:00','2026-10-01T23:59:59+03:00')]:
  fetch(name,'/events/',{'ids':210582,'actual_since':since,'actual_until':until,'fields':FIELDS,'expand':'dates,place,location'})
 fetch('invalid_category','/events/',{'location':'msk','categories':'t104-nonexistent-category','page_size':1,'fields':'id'})
 fetch('missing_event','/events/0/',{'fields':'id,dates,site_url'})
 for event_id in [202293,190707,210889]:fetch('detail_'+str(event_id),f'/events/{event_id}/',{'fields':FIELDS,'expand':'dates,place,location','text_format':'text'})
 fetch('detail_202293_repeat','/events/202293/',{'fields':FIELDS,'expand':'dates,place,location','text_format':'text'})
 for event_id in [202293,210889]:
  e=json.loads((OUT/'receipts'/f'detail_{event_id}.json').read_text(encoding='utf-8'))['payload']
  r,b=fetch('secondary_'+str(event_id),e['site_url'],kind='html')
  observations=[]
  if b:
   text=b.decode('utf-8',errors='replace')
   for field in ['startDate','endDate','dateModified','datePublished','eventStatus']:
    values=re.findall(r'"'+field+r'"\s*:\s*"([^"<>]{1,120})"',text)
    observations.append({'field':field,'observed_values':list(dict.fromkeys(unescape(v) for v in values))[:12]})
  r['secondary_factual_observations']=observations;r['source_event_id']=event_id
  r['notes']='Secondary HTML only; body, descriptions and images discarded. No dates invented from empty extraction.'
  save(f'receipts/secondary_{event_id}.json',r)
