/** Only spawned by isolated integration suite; intentionally killed after a test-only submission. */
import {Worker} from 'bullmq';import Redis from 'ioredis';
import {config} from '../../packages/platform/config.ts';import {connect} from '../../packages/persistence/db.ts';
import {Governor} from '../../packages/platform/governor.ts';import {deliver} from '../../packages/persistence/delivery.ts';
import {TestTransport} from '../../packages/platform/transport.ts';import type {Transport} from '../../packages/platform/transport.ts';
import {requireThat} from '../../packages/domain/errors.ts';
const c=config();requireThat(c.mode==='test'&&new URL(c.databaseUrl).pathname==='/max23_test'&&process.env.RUN_MAX23_INTEGRATION==='1','TEST_ONLY');
const {pool}=connect(c.databaseUrl),r=new Redis(c.redisUrl,{maxRetriesPerRequest:null}),g=new Redis(c.redisUrl,{maxRetriesPerRequest:1});r.on('error',()=>{});g.on('error',()=>{});
const scope=process.env.IT_SCOPE!,epoch=process.env.IT_EPOCH!,queue=process.env.IT_QUEUE!,target=process.env.IT_OUTBOX!;
requireThat(scope.startsWith('isolated-it-')&&queue.startsWith('max23-it-'),'TEST_SCOPE');
const testTransport=new TestTransport(pool,'test');
const transport:Transport={send:async(...args)=>{const result=await testTransport.send(...args);if(args[1]===target){process.send?.('WIRE_ENTERED');return new Promise(()=>{});}return result;}};
const worker=new Worker(queue,job=>deliver(pool,job.data.outboxId,transport,new Governor(g,scope,epoch),'test'),{connection:r,concurrency:1});worker.on('error',()=>{});await worker.waitUntilReady();process.send?.('READY');
