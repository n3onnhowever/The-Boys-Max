/** Test-only exact crash barriers around the existing deliver function. No production fault switches. */
import {Worker} from 'bullmq';
import {Redis} from 'ioredis';
import {config} from '../../packages/platform/config.ts';
import {connect} from '../../packages/persistence/db.ts';
import {Governor} from '../../packages/platform/governor.ts';
import {deliver} from '../../packages/persistence/delivery.ts';
import {TestTransport,type Transport} from '../../packages/platform/transport.ts';
import assert from 'node:assert/strict';
const c=config();assert.equal(c.mode,'test');assert.equal(process.env.RUN_MAX23_INTEGRATION,'1');assert.equal(new URL(c.databaseUrl).pathname,'/max23_test');
const {pool}=connect(c.databaseUrl),r=new Redis(c.redisUrl,{maxRetriesPerRequest:null}),g=new Redis(c.redisUrl,{maxRetriesPerRequest:1,enableOfflineQueue:false});
r.on('error',()=>{});g.on('error',()=>{});
const epoch=(await pool.query('SELECT epoch FROM outbound_control WHERE id=1')).rows[0].epoch;
const gov=new Governor(g,c.credentialScope,epoch),tt=new TestTransport(pool,'test'),phase=process.env.T103_PHASE;
const forever=()=>new Promise<never>(()=>{});
const transport:Transport={send:async(...args)=>{const result=await tt.send(...args);if(phase==='during'){process.send?.('DURING');await forever();}return result;}};
const worker=new Worker('max-effects',async job=>{
 if(job.data.outboxId===process.env.T103_TARGET&&phase==='before'){process.send?.('BEFORE');await forever();}
 await deliver(pool,job.data.outboxId,transport,gov,'test');
 if(job.data.outboxId===process.env.T103_TARGET&&phase==='after'){process.send?.('AFTER');await forever();}
},{connection:r,concurrency:4,lockDuration:30000,maxStalledCount:1});
worker.on('error',()=>{});await worker.waitUntilReady();process.send?.('READY');
