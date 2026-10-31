import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

for(const mode of ['success','cleanup','startup'])test('isolated services propagate cleanup outcomes: '+mode,()=>{
 const result=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(new URL('../fixtures/isolated-services-probe.mjs',import.meta.url)),mode],{encoding:'utf8',timeout:10000});
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/SYNTHETIC cleanup fault-injection PASS/);
});
