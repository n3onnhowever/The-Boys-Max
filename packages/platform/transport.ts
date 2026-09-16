import https from 'node:https';
import type {Pool} from 'pg';
import {requireThat} from '../domain/errors.ts';
import {obj,strictJson,fatalUtf8} from './wire.ts';
import {classifyHttp} from '../domain/delivery.ts';
import type {WireOutcome} from '../contracts/domain.ts';
export interface Transport {send(attemptId:string,outboxId:string,chatId:string,text:string):Promise<WireOutcome>;}
export class TestTransport implements Transport {
 readonly pool:Pool;constructor(pool:Pool,mode:string){requireThat(mode==='test','TEST_TRANSPORT_REQUIRES_TEST_MODE');this.pool=pool;}
 async send(attemptId:string,outboxId:string,_chatId:string,_text:string):Promise<WireOutcome>{
  await this.pool.query('INSERT INTO test_transport_receipts(attempt_id,outbox_id) VALUES($1,$2)',[attemptId,outboxId]);
  return {kind:'SUCCEEDED',providerMessageId:`TEST_ONLY_${attemptId}`};
 }
}
export class MaxTransport implements Transport {
 readonly token:string;
 constructor(token:string,gate:string){requireThat(gate==='REVIEWED_MAX26_LIVE','LIVE_GATE_CLOSED',503);requireThat(token.length>0,'BOT_TOKEN_REQUIRED');this.token=token;}
 send(_attemptId:string,_outboxId:string,chatId:string,text:string):Promise<WireOutcome>{
  const url=new URL('https://platform-api2.max.ru/messages');url.searchParams.set('chat_id',chatId);
  const body=Buffer.from(JSON.stringify({text,notify:true}));
  // Node HTTPS starts exactly one request; no SDK retries, redirects, proxies or caller-selected hosts.
  return new Promise(resolve=>{
   let done=false;let deadline:ReturnType<typeof setTimeout>|undefined;
   const finish=(result:WireOutcome)=>{if(!done){done=true;if(deadline)clearTimeout(deadline);resolve(result);}};
   const req=https.request(url,{method:'POST',headers:{Authorization:this.token,'Content-Type':'application/json','Content-Length':body.length}},res=>{
    const chunks:Buffer[]=[];let size=0;
    res.on('data',(b:Buffer)=>{size+=b.length;if(size>1048576){res.destroy();finish({kind:'UNKNOWN',reason:'RESPONSE_SIZE'});}else chunks.push(b);});
    res.on('error',()=>finish({kind:'UNKNOWN',reason:'RESPONSE_INTERRUPTED'}));
    res.on('end',()=>{
     try{requireThat(/^application\/json(?:\s*;|$)/i.test(res.headers['content-type']??''),'INVALID_RESPONSE_CONTENT_TYPE');
      const x=obj(strictJson(fatalUtf8(Buffer.concat(chunks)),true));
      const message=x.message===undefined?undefined:obj(x.message),mb=message?.body===undefined?undefined:obj(message.body);
      const mid=typeof mb?.mid==='string'?mb.mid:null;
      requireThat(x.success===undefined||typeof x.success==='boolean','INVALID_SUCCESS_TYPE');
      const ra=String(res.headers['retry-after']??'1');const delay=/^\d+$/.test(ra)?Number(ra)*1000:Date.parse(ra)-Date.now();
      const result=classifyHttp(res.statusCode??0,x.success!==false,mid,Number.isFinite(delay)?Math.max(1000,delay):1000);finish(result);
     }catch{finish({kind:'UNKNOWN',reason:'UNDECODABLE_RESPONSE'});}
    });
   });
   deadline=setTimeout(()=>{finish({kind:'UNKNOWN',reason:'ABSOLUTE_REQUEST_TIMEOUT'});req.destroy(new Error('timeout'));},8000);
   req.setTimeout(8000,()=>req.destroy(new Error('timeout')));
   req.on('error',()=>finish({kind:'UNKNOWN',reason:'NETWORK_AFTER_POSSIBLE_SUBMISSION'}));
   req.end(body);
  });
 }
}
