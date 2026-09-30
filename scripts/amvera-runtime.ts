import {fileURLToPath} from 'node:url';
import {Redis} from 'ioredis';
import {connect} from '../packages/persistence/db.ts';
import {config} from '../packages/platform/config.ts';
import {armAmveraOutbound} from '../packages/platform/amvera-outbound.ts';
import {superviseNodeServices} from '../packages/platform/amvera-processes.ts';

const c=config();
const armId=process.env.POVOD_OUTBOUND_ARM_ID;
if(armId){
 if(c.mode!=='live'&&c.mode!=='hybrid')throw new Error('OUTBOUND_ARM_REQUIRES_LIVE_MODE');
 const {pool}=connect(c.databaseUrl);
 const redis=new Redis(c.redisUrl,{maxRetriesPerRequest:1,enableOfflineQueue:false});redis.on('error',()=>{});
 try{
  const status=await armAmveraOutbound(pool,redis,c.credentialScope,armId);
  console.info(JSON.stringify({event:'AMVERA_OUTBOUND_ARM',status}));
 }finally{await Promise.allSettled([pool.end(),redis.quit()]);}
}else console.info(JSON.stringify({event:'AMVERA_OUTBOUND_ARM',status:'NOT_REQUESTED'}));

process.exitCode=await superviseNodeServices([
 {name:'api',script:fileURLToPath(new URL('../apps/api/main.js',import.meta.url))},
 {name:'worker',script:fileURLToPath(new URL('../apps/worker/main.js',import.meta.url))},
]);
