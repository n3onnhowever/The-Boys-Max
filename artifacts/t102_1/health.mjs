import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';
const deadline=Date.now()+45000;let last;
while(Date.now()<deadline){try{
 const live=await fetch('http://localhost:3000/health/live',{signal:AbortSignal.timeout(2000)});
 const liveBody=await live.json();assert.equal(live.status,200);assert.equal(liveBody.alive,true);
 const ready=await fetch('http://localhost:3000/health/ready',{signal:AbortSignal.timeout(2000)});
 const readyBody=await ready.json();assert.equal(ready.status,200);assert.equal(readyBody.database,'UP');assert.equal(typeof readyBody.outboundHold,'boolean');
 const root=await fetch('http://localhost:3000/',{signal:AbortSignal.timeout(2000)});assert.equal(root.status,200);assert.match(root.headers.get('content-type')??'',/text\/html/);
 console.log(JSON.stringify({live:{status:live.status,body:liveBody},ready:{status:ready.status,body:readyBody},html:{status:root.status},checked_at:new Date().toISOString()}));process.exit(0);
}catch(e){last=e;await setTimeout(1000);}}
console.error(last instanceof Error?last.message:'Health unavailable');process.exit(1);
