import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {superviseNodeServices} from '../../packages/platform/amvera-processes.ts';

class FakeChild extends EventEmitter {
 killed=false;
 kill(){this.killed=true;this.emit('close',null,'SIGTERM');return true;}
}

test('if worker exits, API is stopped so Amvera can restart both',async()=>{
 const api=new FakeChild(),worker=new FakeChild(),children=[api,worker],signals=new EventEmitter();
 const running=superviseNodeServices([{name:'api',script:'api.js'},{name:'worker',script:'worker.js'}],{spawn:()=>children.shift() as never,signals:signals as never,log:()=>{}});
 worker.emit('close',1,null);
 assert.equal(api.killed,true);
 assert.equal(await running,1);
});
