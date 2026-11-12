import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requireIntegrationHistory} from '../../scripts/lib/integration-history.ts';

test('integration history preflight explains a Git-free checkout before starting services',()=>{
 const root=mkdtempSync(join(tmpdir(),'povod-history-'));
 try{assert.throws(()=>requireIntegrationHistory(root),/BLOCKED_GIT_HISTORY:.*full Git checkout.*fetch-depth: 0/);}
 finally{rmSync(root,{recursive:true});}
});

test('integration history preflight accepts the actual full historical checkout',()=>{
 assert.doesNotThrow(()=>requireIntegrationHistory());
});
