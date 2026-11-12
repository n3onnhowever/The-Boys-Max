import {createHash,createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {Redis} from 'ioredis';
import {AppError} from '../domain/errors.ts';
import type {Config} from './config.ts';

// Conservative startup policy, not measured production capacity. One start/reload needs one permit.
// A fixed window starts with its first admission. Boundary bursts can span two adjacent windows.
export const bootstrapPolicy=Object.freeze({peer:64,global:256,windowMs:60_000} as const);
const admitScript=`
local total=tonumber(redis.call('HGET',KEYS[1],'total') or '0')
if total>0 and redis.call('PTTL',KEYS[1])<0 then return -1 end
local peer=tonumber(redis.call('HGET',KEYS[1],ARGV[1]) or '0')
if total>=tonumber(ARGV[3]) or peer>=tonumber(ARGV[2]) then return 0 end
redis.call('HINCRBY',KEYS[1],'total',1)
redis.call('HINCRBY',KEYS[1],ARGV[1],1)
if total==0 then redis.call('PEXPIRE',KEYS[1],ARGV[4]) end
return 1`;

function canonicalPeer(peer:string):string|null {
 if(isIP(peer)===4)return peer;
 if(isIP(peer)!==6)return null;
 // URL canonicalization collapses equivalent IPv6 spellings; mapped IPv4 shares its IPv4 budget.
 try{
  const value=new URL('http://['+peer+']/').hostname.slice(1,-1);
  const mapped=/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(value);
  if(!mapped)return value;
  const high=parseInt(mapped[1]!,16),low=parseInt(mapped[2]!,16);
  return [high>>>8,high&255,low>>>8,low&255].join('.');
 }catch{return null;}
}

export class BootstrapAdmission {
 private readonly redis:Redis;
 private readonly key:string;
 private readonly peerKey:string;
 private connecting:Promise<void>|undefined;
 private inFlight=0;
 constructor(c:Pick<Config,'redisUrl'|'mode'|'credentialScope'|'publicOrigin'|'sessionKey'>){
  // Same deployment scope on every replica; no raw address or private fingerprint in logs.
  const scope=createHash('sha256').update(JSON.stringify([c.mode,c.credentialScope,c.publicOrigin])).digest('hex');
  this.key=`povod:bootstrap:{${scope}}:state`;this.peerKey=c.sessionKey;
  this.redis=new Redis(c.redisUrl,{lazyConnect:true,enableOfflineQueue:false,enableReadyCheck:false,
   connectTimeout:500,commandTimeout:500,maxRetriesPerRequest:0,retryStrategy:()=>null});
  this.redis.on('error',()=>{}); // Routes expose only the fixed unavailable code, never connection details.
 }
 async admit(directPeer:string|undefined):Promise<void>{
  const peer=directPeer&&canonicalPeer(directPeer);
  if(!peer)throw new AppError('BOOTSTRAP_ADMISSION_UNAVAILABLE',503);
  // Bound this client's pending work too, including while Redis is connecting/unavailable.
  if(this.inFlight>=bootstrapPolicy.global)throw new AppError('BOOTSTRAP_LIMIT',429);
  this.inFlight++;
  let admitted:unknown;
  try{
   if(this.redis.status!=='ready'){
    this.connecting??=this.redis.connect().finally(()=>{this.connecting=undefined;});
    await this.connecting;
   }
   const fingerprint=createHmac('sha256',this.peerKey).update('bootstrap-peer:'+peer).digest('hex');
   admitted=await this.redis.eval(admitScript,1,this.key,fingerprint,bootstrapPolicy.peer,bootstrapPolicy.global,bootstrapPolicy.windowMs);
  }catch{
   // A timed-out EVAL may have consumed a permit. Never insert a row, replay it, or retain a stuck queue.
   this.redis.disconnect();throw new AppError('BOOTSTRAP_ADMISSION_UNAVAILABLE',503);
  }finally{this.inFlight--;}
  if(admitted===0)throw new AppError('BOOTSTRAP_LIMIT',429);
  if(admitted!==1)throw new AppError('BOOTSTRAP_ADMISSION_UNAVAILABLE',503);
 }
 close(){this.redis.disconnect();}
}
