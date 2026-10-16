import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticCandidate} from '../catalog-fixtures.ts';
import {context,defaultIntent} from '../../modules/integration/projections.ts';
import {evaluateEligibility} from '../../modules/search/core/eligibility.ts';
import {listedForDiscovery} from '../../packages/persistence/catalog.ts';
import type {Candidate} from '../../modules/search/core/types.ts';

const now='2026-10-17T12:00:00.000Z';
function eligibility(patch:Partial<Candidate>={}){
 return evaluateEligibility(defaultIntent(),{...syntheticCandidate(now),starts_at:'2026-10-18T12:00:00.000Z',ends_at:null,...patch},context(now));
}
test('future scheduled occurrence is eligible for discovery despite unknown provider health',()=>{
 assert.equal(listedForDiscovery(eligibility({provider_health:'UNKNOWN'}),false),true);
});
test('K11 past start with unknown end is not a confirmed upcoming discovery result',()=>{
 const e=eligibility({starts_at:'2026-10-16T12:00:00.000Z'});
 assert.ok(e.checks.some(c=>c.reason==='START_PASSED_END_UNKNOWN'));
 assert.equal(listedForDiscovery(e,false),false);
});
test('confirmed ended and ongoing occurrences are excluded from future discovery',()=>{
 for(const ends_at of ['2026-10-16T14:00:00.000Z',now,'2026-10-18T14:00:00.000Z'])
  assert.equal(listedForDiscovery(eligibility({starts_at:'2026-10-16T12:00:00.000Z',ends_at}),false),false);
});
test('exact historical detail remains accessible, including ended and cancelled records',()=>{
 for(const patch of [{starts_at:'2026-10-16T12:00:00.000Z'},{starts_at:'2026-10-16T12:00:00.000Z',ends_at:now},{status:'CANCELLED' as const}])
  assert.equal(listedForDiscovery(eligibility(patch),true),true);
});
test('cancelled and unknown source event status cannot establish upcoming discovery',()=>{
 for(const status of ['CANCELLED','UNKNOWN','POSTPONED'] as const)
  assert.equal(listedForDiscovery(eligibility({status}),false),false);
});
test('unobserved listing is excluded from discovery but can be opened by exact reference',()=>{
 const e=eligibility({listing_state:'MISSING_FROM_FEED'});
 assert.equal(listedForDiscovery(e,false),false);
 assert.equal(listedForDiscovery(e,true),true);
});
