import {maxTlsOptions} from './max-tls.ts';
import https from 'node:https';
import type {Pool} from 'pg';
import {requireThat} from '../domain/errors.ts';
import {obj,strictJson,fatalUtf8} from './wire.ts';
import {classifyHttp} from '../domain/delivery.ts';
import type {BotAttachment} from './bot.ts';
import type {WireOutcome} from '../contracts/domain.ts';
export interface Transport {send(attemptId:string,outboxId:string,chatId:string,text:string,attachments?:BotAttachment[]):Promise<WireOutcome>;}
export class TestTransport implements Transport {
 readonly pool:Pool;constructor(pool:Pool,mode:string){requireThat(mode==='test','TEST_TRANSPORT_REQUIRES_TEST_MODE');this.pool=pool;}
 async send(attemptId:string,outboxId:string,_chatId:string,_text:string,_attachments?:BotAttachment[]):Promise<WireOutcome>{
  await this.pool.query('INSERT INTO test_transport_receipts(attempt_id,outbox_id) VALUES($1,$2)',[attemptId,outboxId]);
  return {kind:'SUCCEEDED',providerMessageId:`TEST_ONLY_${attemptId}`};
 }
}
export class MaxTransport implements Transport {
 readonly token:string;readonly tlsOptions:ReturnType<typeof maxTlsOptions>;
 constructor(token:string,gate:string){requireThat(gate==='REVIEWED_MAX26_LIVE','LIVE_GATE_CLOSED',503);requireThat(token.length>0,'BOT_TOKEN_REQUIRED');this.token=token;this.tlsOptions=maxTlsOptions();}
 send(_attemptId:string,_outboxId:string,chatId:string,text:string,attachments?:BotAttachment[]):Promise<WireOutcome>{
  const url=new URL('https://platform-api2.max.ru/messages');url.searchParams.set('chat_id',chatId);
  const body=Buffer.from(JSON.stringify({text,notify:true,...(attachments?.length?{attachments}:{})}));
  // Node HTTPS starts exactly one request; no SDK retries, redirects, proxies or caller-selected hosts.
  return new Promise(resolve=>{
   let done=false;let deadline:ReturnType<typeof setTimeout>|undefined;
   const finish=(result:WireOutcome)=>{if(!done){done=true;if(deadline)clearTimeout(deadline);resolve(result);}};
   const req=https.request(url,{...this.tlsOptions,method:'POST',headers:{Authorization:this.token,'Content-Type':'application/json','Content-Length':body.length}},res=>{
    // Error envelopes are optional: definitive rejection is known at headers.
    if(res.statusCode!==undefined&&res.statusCode>=400&&res.statusCode<500){
     res.on('error',()=>{});
     finish(maxResponseOutcome(res.statusCode,'',Buffer.alloc(0),String(res.headers['retry-after']??'')));
     res.destroy();return;
    }
    const chunks:Buffer[]=[];let size=0;
    res.on('data',(b:Buffer)=>{size+=b.length;if(size>1048576){res.destroy();finish({kind:'UNKNOWN',reason:'RESPONSE_SIZE'});}else chunks.push(b);});
    res.on('error',()=>finish({kind:'UNKNOWN',reason:'RESPONSE_INTERRUPTED'}));
    res.on('end',()=>{
     finish(maxResponseOutcome(res.statusCode??0,res.headers['content-type']??'',Buffer.concat(chunks),String(res.headers['retry-after']??'')));
    });
   });
   deadline=setTimeout(()=>{finish({kind:'UNKNOWN',reason:'ABSOLUTE_REQUEST_TIMEOUT'});req.destroy(new Error('timeout'));},8000);
   req.setTimeout(8000,()=>req.destroy(new Error('timeout')));
   req.on('error',()=>finish({kind:'UNKNOWN',reason:'NETWORK_AFTER_POSSIBLE_SUBMISSION'}));
   req.end(body);
  });
 }
}

/** Definite HTTP rejection is classified before decoding the optional error body. */
export function maxResponseOutcome(status:number,contentType:string,body:Buffer,retryAfter:string,now=Date.now()):WireOutcome {
 const delay=/^\d+$/.test(retryAfter)?Number(retryAfter)*1000:Date.parse(retryAfter)-now;
 const retryMs=Number.isNaN(delay)?1000:Math.min(86400000,Math.max(1000,delay));
 if(status>=400&&status<500)return classifyHttp(status,false,null,retryMs);
 if(status!==200)return {kind:'UNKNOWN',reason:'POSSIBLE_SUBMISSION'};
 try{
  requireThat(/^application\/json(?:\s*;|$)/i.test(contentType),'INVALID_RESPONSE_CONTENT_TYPE');
  const x=obj(strictJson(fatalUtf8(body),true));
  requireThat(x.success===undefined||typeof x.success==='boolean','INVALID_SUCCESS_TYPE');
  if(x.success===false)return classifyHttp(status,false,null,retryMs);
  const message=x.message===undefined?undefined:obj(x.message),mb=message?.body===undefined?undefined:obj(message.body);
  return classifyHttp(status,true,typeof mb?.mid==='string'?mb.mid:null,retryMs);
 }catch{return {kind:'UNKNOWN',reason:'UNDECODABLE_RESPONSE'};}
}
