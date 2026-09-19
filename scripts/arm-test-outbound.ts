import {Redis} from 'ioredis';import {randomUUID} from 'node:crypto';import {setTimeout} from 'node:timers/promises';
import {connect} from '../packages/persistence/db.ts';import {config} from '../packages/platform/config.ts';import {requireThat} from '../packages/domain/errors.ts';import {digest} from '../packages/platform/auth.ts';
const cfg=config();requireThat(cfg.mode==='test'&&new URL(cfg.databaseUrl).pathname==='/max23_test','TEST_ONLY');
const {pool}=connect(cfg.databaseUrl),redis=new Redis(cfg.redisUrl,{maxRetriesPerRequest:1});redis.on('error',()=>{});
try{const epoch=randomUUID();await pool.query("UPDATE outbound_control SET hold=true,epoch=$1,reason='TEST_REINITIALIZATION' WHERE id=1",[epoch]);
 const t=await redis.time(),now=Number(t[0])*1000+Math.floor(Number(t[1])/1000);
 await redis.set(`maxgov:{${digest(cfg.credentialScope)}}:state`,JSON.stringify({epoch,lastTime:now,holdUntil:now+10000,globalNext:0,cooldown:0,turn:0,seq:0,dests:{},waiters:{}}));
 await setTimeout(10000);await pool.query("UPDATE outbound_control SET hold=false,reason='EXPLICIT_TEST_TRANSPORT_ONLY' WHERE id=1");
 console.log('Synthetic outbound armed. Start/restart worker now so it reads the new epoch.');
}finally{await redis.quit();await pool.end();}
