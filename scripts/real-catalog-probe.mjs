import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';

const out=new URL('../.run-evidence/real-catalog/source-receipts/',import.meta.url);
await mkdir(out,{recursive:true});
const since=Math.floor(Date.parse('2026-09-25T21:00:00Z')/1000);
const until=Math.floor(Date.parse('2026-10-25T20:59:59Z')/1000);
const base='https://kudago.com/public-api/v1.4/';
const query=(path,params)=>`${base}${path}/?${new URLSearchParams(params)}`;
const jobs=[
 ['events',query('events',{location:'msk',actual_since:since,actual_until:until,page_size:30,fields:'id,title,site_url,dates,place,price,is_free,categories'})],
 ['places',query('places',{location:'msk',page_size:20,fields:'id,title,site_url,address,is_closed'})],
 ['movies',query('movies',{location:'msk',page_size:20,fields:'id,title,site_url'})],
 ['movie-showings',query('movie-showings',{location:'msk',actual_since:since,actual_until:until,page_size:30,expand:'movie,place'})],
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipts=[];
for(const [name,url] of jobs){
 const started=new Date().toISOString();
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{accept:'application/json'}});
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>4*1024*1024)throw Error('PAGE_BYTES_EXCEEDED');
  const body=JSON.parse(bytes.toString('utf8'));
  const rows=Array.isArray(body.results)?body.results:Array.isArray(body)?body:name==='event-detail'?[body]:[];
  const receipt={name,url,started,status:response.status,bytes:bytes.length,sha256:sha(bytes),count:body.count??rows.length,next:body.next??null,
   sample:rows.slice(0,10).map(r=>({id:r.id,title:r.title??r.movie?.title??null,site_url:r.site_url??r.movie?.site_url??null,
    dates_total:r.dates?.length??null,dates:r.dates?.filter?.(d=>typeof d.start==='number'&&d.start>=since&&d.start<=until).slice(0,3)??null,datetime:r.datetime??null,place:r.place&&typeof r.place==='object'?{id:r.place.id,title:r.place.title,site_url:r.place.site_url,address:r.place.address}:r.place??null,
    price:r.price??null,is_free:r.is_free??null,movie:r.movie&&typeof r.movie==='object'?{id:r.movie.id,title:r.movie.title,site_url:r.movie.site_url}:r.movie??null,
    missing:['site_url','price','place'].filter(k=>r[k]===undefined||r[k]===null)}))};
  await writeFile(new URL(`${name}.json`,out),JSON.stringify(receipt,null,2)+'\n');receipts.push({name,status:response.status,count:receipt.count,sample:receipt.sample.length,sha256:receipt.sha256});
  if(name==='events'&&rows[0]?.id){jobs.splice(1,0,['event-detail',`${base}events/${rows[0].id}/?fields=id,title,site_url,dates,place,price,is_free,categories`]);}
 }catch(error){const receipt={name,url,started,error:String(error)};await writeFile(new URL(`${name}.json`,out),JSON.stringify(receipt,null,2)+'\n');receipts.push(receipt);}
}
console.log(JSON.stringify(receipts));
