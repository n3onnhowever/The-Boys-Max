import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import type {Pool} from 'pg';
import type {Redis} from 'ioredis';
import {digest} from './auth.ts';

/** One explicit operator arm per ID. Reusing the ID after restart never resets a lost governor. */
export async function armAmveraOutbound(db:Pick<Pool,'query'>,redis:Pick<Redis,'time'|'set'>,scope:string,armId:string|undefined,wait:(ms:number)=>Promise<unknown>=ms=>delay(ms)):
 Promise<'HELD'|'ALREADY_ARMED'|'ARMED'> {
 if(!armId)return 'HELD';
 if(!/^[A-Za-z0-9_-]{8,64}$/.test(armId))throw new Error('OUTBOUND_ARM_ID_INVALID');
 const reason=`AMVERA_ARM_${armId}`;
 const current=await db.query<{hold:boolean;reason:string}>('SELECT hold,reason FROM outbound_control WHERE id=1');
 if(current.rows[0]?.hold===false&&current.rows[0]?.reason===reason)return 'ALREADY_ARMED';
 const uncertain=await db.query<{count:string}>('SELECT count(*)::text count FROM outbox WHERE state=\'UNKNOWN\'');
 if(Number(uncertain.rows[0]?.count??0)>0)throw new Error('OUTBOUND_UNKNOWN_REVIEW_REQUIRED');
 const epoch=randomUUID();
 const locked=await db.query("UPDATE outbound_control SET hold=true,epoch=$1,reason='AMVERA_ARMING' WHERE id=1",[epoch]);
 if(locked.rowCount!==1)throw new Error('OUTBOUND_CONTROL_MISSING');
 const [seconds,microseconds]=await redis.time();
 const now=Number(seconds)*1000+Math.floor(Number(microseconds)/1000);
 if(!Number.isSafeInteger(now)||now<=0)throw new Error('REDIS_TIME_INVALID');
 await redis.set(`maxgov:{${digest(scope)}}:state`,JSON.stringify({epoch,lastTime:now,holdUntil:now+10000,globalNext:0,cooldown:0,turn:0,seq:0,dests:{},waiters:{}}));
 await wait(10000);
 const released=await db.query('UPDATE outbound_control SET hold=false,reason=$1 WHERE id=1 AND epoch=$2',[reason,epoch]);
 if(released.rowCount!==1)throw new Error('OUTBOUND_EPOCH_CHANGED');
 return 'ARMED';
}
