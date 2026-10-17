import test from 'node:test';
import assert from 'node:assert/strict';
import { safeDemoSourceUrl } from '../../apps/miniapp/src/core/links.ts';

test('demo source link accepts only a first-party explanatory page', () => {
  const origin = 'http://127.0.0.1:3000';
  assert.equal(safeDemoSourceUrl(`${origin}/demo/source/paper-stage`, origin), `${origin}/demo/source/paper-stage`);
  assert.equal(safeDemoSourceUrl(`${origin}/demo/source/v3/park-warmup`, origin), `${origin}/demo/source/v3/park-warmup`);
  for (const url of [
    'http://127.0.0.1:3001/demo/source/paper-stage',
    `${origin}/demo/source/../admin`, `${origin}/demo/source/paper-stage?next=1`,
    'https://example.org/demo/source/paper-stage',
    `${origin}/demo/source/paper-stage#section`,
    `${origin}/demo/source/v4/park-warmup`, `${origin}/demo/source/v3/park-warmup/extra`,
    `${origin}/demo/source/v3/park-warmup?next=1`, `${origin}/demo/source/v3/park-warmup#section`,
  ]) assert.equal(safeDemoSourceUrl(url, origin), null, url);
});
