import test from 'node:test';
import assert from 'node:assert/strict';
import {armAmveraOutbound} from '../../packages/platform/amvera-outbound.ts';

test('without an explicit arm id outbound stays held',async()=>{
 let queries=0;
 const result=await armAmveraOutbound({query:async()=>{queries++;throw Error('unexpected query')}} as never,{time:async()=>['0','0'],set:async()=>{throw Error('unexpected Redis write')}} as never,'scope',undefined,async()=>{});
 assert.equal(result,'HELD');assert.equal(queries,0);
});

test('explicit first arm initializes governor before releasing database hold',async()=>{
 const order:string[]=[];
 const db={query:async(sql:string,params?:unknown[])=>{
  if(sql.startsWith('SELECT hold,reason'))return {rows:[{hold:true,reason:'INITIAL_HOLD'}],rowCount:1};
  if(sql.startsWith('SELECT count(*)'))return {rows:[{count:'0'}],rowCount:1};
  if(sql.startsWith('UPDATE outbound_control SET hold=true')){order.push('hold');assert.equal(typeof params?.[0],'string');return {rows:[],rowCount:1};}
  if(sql.startsWith('UPDATE outbound_control SET hold=false')){order.push('release');assert.equal(params?.[0],'AMVERA_ARM_HACKATHON26');return {rows:[],rowCount:1};}
  throw Error(`Unexpected SQL: ${sql}`);
 }};
 const redis={time:async()=>['100','500000'],set:async(_key:string,value:string)=>{order.push('redis');const state=JSON.parse(value);assert.equal(state.holdUntil,110500);assert.equal(state.lastTime,100500);return 'OK';}};
 const result=await armAmveraOutbound(db as never,redis as never,'scope','HACKATHON26',async(ms:number)=>{assert.equal(ms,10000);order.push('wait')});
 assert.equal(result,'ARMED');assert.deepEqual(order,['hold','redis','wait','release']);
});

test('same arm id does not reinitialize the governor after restart',async()=>{
 const db={query:async(sql:string)=>{assert.match(sql,/^SELECT hold,reason/);return {rows:[{hold:false,reason:'AMVERA_ARM_HACKATHON26'}],rowCount:1}}};
 const result=await armAmveraOutbound(db as never,{time:async()=>{throw Error('unexpected Redis call')}} as never,'scope','HACKATHON26',async()=>{});
 assert.equal(result,'ALREADY_ARMED');
});

test('uncertain MAX deliveries require review before arming',async()=>{
 const db={query:async(sql:string)=>sql.startsWith('SELECT hold,reason')?{rows:[{hold:true,reason:'INITIAL_HOLD'}],rowCount:1}:{rows:[{count:'1'}],rowCount:1}};
 await assert.rejects(armAmveraOutbound(db as never,{} as never,'scope','HACKATHON26',async()=>{}),/OUTBOUND_UNKNOWN_REVIEW_REQUIRED/);
});
