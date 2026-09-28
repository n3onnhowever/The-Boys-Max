import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerPreviewAllowed} from '../../packages/platform/config.ts';

test('owner preview is limited to explicit local development sessions',()=>{
 const local='http://127.0.0.1:3000';
 assert.equal(ownerPreviewAllowed({POVOD_OWNER_PREVIEW:'1',NODE_ENV:'development'},'hybrid',local),true);
 assert.equal(ownerPreviewAllowed({POVOD_OWNER_PREVIEW:'1',NODE_ENV:'production'},'hybrid',local),false);
 assert.equal(ownerPreviewAllowed({POVOD_OWNER_PREVIEW:'1',NODE_ENV:'development'},'live',local),false);
 assert.equal(ownerPreviewAllowed({POVOD_OWNER_PREVIEW:'1',NODE_ENV:'development'},'hybrid','https://example.com'),false);
 assert.equal(ownerPreviewAllowed({NODE_ENV:'development'},'demo',local),false);
});
