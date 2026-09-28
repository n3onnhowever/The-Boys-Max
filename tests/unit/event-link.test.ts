import test from 'node:test';
import assert from 'node:assert/strict';
import {eventRouteFromToken,eventShareUrl} from '../../apps/miniapp/src/core/event-link.ts';

test('shared event link opens the same occurrence without showing provider identifiers in the visible URL',()=>{
 const route={kind:'EVENT' as const,sourceId:'ManualProvider',externalEventId:'demo-v1-short-films',occurrenceId:'demo-v1-short-films-session',scope:{kind:'PERSONAL' as const}};
 const url=new URL(eventShareUrl(route,'http://127.0.0.1:3000'));
 assert.equal(url.searchParams.has('route'),false);
 assert.equal(url.href.includes('ManualProvider'),false);
 assert.deepEqual(eventRouteFromToken(url.searchParams.get('event')),route);
 assert.equal(eventRouteFromToken('invalid!'),null);
});
