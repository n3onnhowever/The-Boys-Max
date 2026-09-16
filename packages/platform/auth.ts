import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {requireThat} from '../domain/errors.ts';
import {strictJson,obj,int64,boundedText} from './wire.ts';
export function equalSecret(a:string,b:string):boolean {const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function digest(text:string){return createHash('sha256').update(text).digest('hex');}
export function keyed(key:string,value:string){return createHmac('sha256',key).update(value).digest('hex');}
export function verifyInitData(raw:string,botToken:string,nowSeconds:number) {
 requireThat(typeof raw==='string'&&Buffer.byteLength(raw)<=65536&&raw.length>0,'INIT_DATA_SIZE');
 const fields=new Map<string,string>();
 for(const part of raw.split('&')){
  const split=part.indexOf('=');requireThat(split>0,'FORM_SYNTAX');
  const decode=(s:string)=>{requireThat(!/%(?![a-fA-F0-9]{2})/.test(s),'FORM_ENCODING');try{return decodeURIComponent(s.replace(/\+/g,' '));}catch{requireThat(false,'FORM_ENCODING');}};
  const k=decode(part.slice(0,split)),v=decode(part.slice(split+1));
  requireThat(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)&&!fields.has(k),'DUPLICATE_FORM_KEY');fields.set(k,v);
 }
 const hash=fields.get('hash');requireThat(hash&&/^[a-fA-F0-9]{64}$/.test(hash),'HASH_FORMAT',401);fields.delete('hash');
 const canonical=[...fields].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${k}=${v}`).join('\n');
 const secret=createHmac('sha256','WebAppData').update(botToken).digest();
 requireThat(equalSecret(createHmac('sha256',secret).update(canonical).digest('hex'),hash.toLowerCase()),'AUTH_INVALID',401);
 const auth=fields.get('auth_date');requireThat(auth&&/^\d{1,12}$/.test(auth),'AUTH_DATE',401);const authDate=Number(auth);
 requireThat(nowSeconds-authDate<3600 && authDate-nowSeconds<=300,'AUTH_EXPIRED',401);
 const user=obj(strictJson(fields.get('user')??'',true)),actorExternalId=int64(user.id,true);
 const displayName=boundedText(user.first_name);
 for(const value of [user.last_name,user.username])if(value!==undefined&&value!==null)requireThat(typeof value==='string'&&value.length<=160,'STRING_REQUIRED');
 let chatId:string|null=null;
 if(fields.has('chat')){const chat=strictJson(fields.get('chat')!,true);if(chat!==null)chatId=int64(obj(chat).id);}
 return {actorExternalId,displayName,authDate,proofFingerprint:digest(canonical),chatId};
}
