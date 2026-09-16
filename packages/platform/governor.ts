import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import type Redis from 'ioredis';
import {requireThat} from '../domain/errors.ts';
import {digest} from './auth.ts';
const script=readFileSync(new URL('./governor.lua',import.meta.url),'utf8');
export class Governor {
 readonly redis:Redis;readonly key:string;readonly epoch:string;
 constructor(redis:Redis,scope:string,epoch:string){this.redis=redis;this.key=`maxgov:{${digest(scope)}}:state`;this.epoch=epoch;}
 async start<T>(destination:string,kind:'INTERACTIVE'|'BACKGROUND',wire:()=>Promise<T>):Promise<T>{
  const requestId=randomUUID(),until=performance.now()+5000;
  while(performance.now()<until){
   const begin=performance.now();
   const r=await this.redis.eval(script,1,this.key,this.epoch,requestId,digest(destination),kind,0) as string[];
   requireThat(Array.isArray(r)&&r[0]!=='HOLD','GOVERNOR_HOLD',503);
   if(r[0]==='GRANTED'){
    // No await between the final monotonic guard and the transport invocation. Late permits burn budget, never send.
    if(performance.now()-begin<=5)return wire();
   }else await sleep(Math.min(200,Math.max(5,Number(r[1]))));
  }
  requireThat(false,'GOVERNOR_PROGRESS_TIMEOUT',503);
 }
 async cooldown(ms:number){
  await this.redis.eval(`local r=redis.call('GET',KEYS[1]);if not r then return 0 end;local s=cjson.decode(r);if s.epoch~=ARGV[1] then return 0 end;local t=redis.call('TIME');local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000);s.cooldown=math.max(s.cooldown,now+tonumber(ARGV[2]));redis.call('SET',KEYS[1],cjson.encode(s));return 1`,1,this.key,this.epoch,ms);
 }
}
