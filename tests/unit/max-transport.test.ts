import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {MaxTransport} from '../../packages/platform/transport.ts';

// Synthetic HTTP boundary only: the real HTTPS request function is replaced; no MAX connection.
test('MAX 429 with ordinary error.message maps to safe retry and Retry-After',async t=>{
 const req=new EventEmitter() as EventEmitter & {setTimeout:()=>void;end:()=>void;destroy:()=>void};
 req.setTimeout=()=>{};req.destroy=()=>{};
 t.mock.method(https,'request',(_url:unknown,_options:unknown,callback:(res:unknown)=>void)=>{
  req.end=()=>queueMicrotask(()=>{
   const res=Object.assign(new EventEmitter(),{destroy(){},statusCode:429,headers:{'content-type':'application/json','retry-after':'3'}});
   callback(res);res.emit('data',Buffer.from('{"code":"rate.limit","message":"Too many requests"}'));res.emit('end');
  });
  return req;
 });
 assert.deepEqual(await new MaxTransport('SYNTHETIC_TEST_TOKEN','REVIEWED_MAX26_LIVE').send('attempt','outbox','123','test'),
  {kind:'RETRY_WAIT',retryAfterMs:3000,reason:'PROVIDER_429'});
});

test('transport preserves keyboard body and sends only to pinned MAX API2',async t=>{
 let target:URL|undefined,options:{headers:Record<string,unknown>;ca?:string[];rejectUnauthorized?:boolean}|undefined,body:Buffer|undefined,calls=0;
 const req=Object.assign(new EventEmitter(),{setTimeout(){},destroy(){},end(_body:Buffer){}});
 t.mock.method(https,'request',(url:URL,opts:typeof options,callback:(res:unknown)=>void)=>{
  calls++;target=url;options=opts;
  req.end=(b:Buffer)=>{body=b;queueMicrotask(()=>{
   const res=Object.assign(new EventEmitter(),{destroy(){},statusCode:200,headers:{'content-type':'application/json'}});
   callback(res);res.emit('data',Buffer.from('{"message":{"body":{"mid":"synthetic-accepted"}}}'));res.emit('end');
  });};return req;
 });
 const {botMessage}=await import('../../packages/platform/bot.ts');
 const reply=botMessage('WELCOME',{botUsername:'synthetic_bot',miniappUrl:'https://synthetic.example/app'});
 const result=await new MaxTransport('SYNTHETIC_TEST_TOKEN','REVIEWED_MAX26_LIVE').send('attempt','outbox','9007199254740993',reply.text,reply.attachments);
 assert.equal(calls,1);assert.equal(target!.origin,'https://platform-api2.max.ru');
 assert.equal(target!.searchParams.get('chat_id'),'9007199254740993');assert.equal(target!.searchParams.has('access_token'),false);
 assert.equal(options!.headers.Authorization,'SYNTHETIC_TEST_TOKEN');
 assert.equal(options!.rejectUnauthorized,true);assert.ok(options!.ca!.some(pem=>pem.includes('BEGIN CERTIFICATE')));
 assert.deepEqual(JSON.parse(body!.toString()),{text:reply.text,notify:true,attachments:reply.attachments});
 assert.deepEqual(result,{kind:'SUCCEEDED',providerMessageId:'synthetic-accepted'});
});
test('HTTP outcome classification keeps ambiguous sends out of retry',async()=>{
 const {maxResponseOutcome}=await import('../../packages/platform/transport.ts');
 const response=(status:number,body:string,retry='')=>maxResponseOutcome(status,'application/json',Buffer.from(body),retry,1800000000000);
 assert.deepEqual(response(429,'not JSON','5'),{kind:'RETRY_WAIT',reason:'PROVIDER_429',retryAfterMs:5000});
 assert.equal(response(429,'{}','invalid').kind,'RETRY_WAIT');
 assert.deepEqual(response(429,'{}',new Date(1800000004000).toUTCString()),{kind:'RETRY_WAIT',reason:'PROVIDER_429',retryAfterMs:4000});
 for(const status of [301,500,502,503])assert.equal(response(status,'{}').kind,'UNKNOWN');
 for(const body of ['{}','{broken','{"success":true}','{"message":"not a receipt"}'])assert.equal(response(200,body).kind,'UNKNOWN');
 assert.equal(response(200,'{"success":false,"message":"Rejected"}').kind,'DEAD');
 assert.equal(response(401,'not JSON').kind,'DEAD');
 assert.equal(maxResponseOutcome(200,'text/html',Buffer.from('blocked'),'').kind,'UNKNOWN');
});
test('network failure after possible submission is UNKNOWN and is not retried',async t=>{
 let calls=0;const req=Object.assign(new EventEmitter(),{setTimeout(){},destroy(){},end(){queueMicrotask(()=>req.emit('error',new Error('synthetic disconnect')));}});
 t.mock.method(https,'request',()=>{calls++;return req;});
 const result=await new MaxTransport('SYNTHETIC_TEST_TOKEN','REVIEWED_MAX26_LIVE').send('a','o','123','test');
 assert.equal(result.kind,'UNKNOWN');assert.equal(calls,1);
});

for(const status of [400,401,403,404,429])test('HTTP '+status+' string message is a definitive response with scoped TLS',async t=>{
 let calls=0;const req=Object.assign(new EventEmitter(),{setTimeout(){},destroy(){},end(){}});
 t.mock.method(https,'request',(url:URL,options:https.RequestOptions,callback:(res:unknown)=>void)=>{
  calls++;assert.equal(url.origin,'https://platform-api2.max.ru');assert.equal(options.rejectUnauthorized,true);assert.ok(Array.isArray(options.ca));
  req.end=()=>queueMicrotask(()=>{const res=Object.assign(new EventEmitter(),{destroy(){},statusCode:status,headers:{'content-type':'application/json','retry-after':'3'}});callback(res);res.emit('data',Buffer.from(JSON.stringify({message:'SYNTHETIC rejection'})));res.emit('end');});return req;
 });
 const result=await new MaxTransport('SYNTHETIC_TEST_TOKEN','REVIEWED_MAX26_LIVE').send('a','o','123','test');
 assert.equal(result.kind,status===429?'RETRY_WAIT':'DEAD');assert.equal(calls,1);
});

for(const status of [401,429])test('definitive '+status+' does not depend on optional error body completion',async t=>{
 let destroyed=false;const req=Object.assign(new EventEmitter(),{setTimeout(){},destroy(){},end(){}});
 t.mock.method(https,'request',(_url:URL,_options:https.RequestOptions,callback:(res:unknown)=>void)=>{
  req.end=()=>queueMicrotask(()=>{const res=Object.assign(new EventEmitter(),{destroy(){destroyed=true;},statusCode:status,headers:{'retry-after':'2'}});callback(res);res.emit('error',new Error('SYNTHETIC truncated body'));res.emit('data',Buffer.alloc(1048577));});return req;
 });
 const result=await new MaxTransport('SYNTHETIC_TEST_TOKEN','REVIEWED_MAX26_LIVE').send('a','o','123','test');
 assert.equal(result.kind,status===429?'RETRY_WAIT':'DEAD');assert.equal(destroyed,true);
});
