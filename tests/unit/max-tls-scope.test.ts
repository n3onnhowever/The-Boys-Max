import test from 'node:test';
import assert from 'node:assert/strict';
import tls from 'node:tls';
import {maxTlsOptions} from '../../packages/platform/max-tls.ts';
test('MAX trust configuration keeps global Node trust unchanged',()=>{
 const before=tls.getCACertificates('default');
 const options=maxTlsOptions();
 assert.equal(options.rejectUnauthorized,true);
 assert.equal(Array.isArray(options.ca),true);
 assert.equal((options.ca as string[]).length,tls.rootCertificates.length+1);
 assert.deepEqual(tls.getCACertificates('default'),before);
});
