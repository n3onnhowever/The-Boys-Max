import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticCandidate} from '../catalog-fixtures.ts';
import {matchesCandidateText,normalizeSearchText,searchWords} from '../../modules/integration/text-search.ts';
import {recommendationFor,rankRecommendations} from '../../modules/integration/recommendations.ts';
import type {Preferences} from '../../packages/persistence/social.ts';

const prefs:Preferences={city:'Москва',interests:[],budgetRub:null,radiusKm:15,notificationsEnabled:true,preferredTime:'ANY'};
const candidate=syntheticCandidate('2026-09-28T12:00:00.000Z','hardening-unit');

test('literal text search normalizes case, ё and punctuation; all words may span canonical fields',()=>{
 const c={...candidate,untrusted_title:'Ёж и театр',venue:{...candidate.venue,address:'Парк Горького'}};
 assert.equal(normalizeSearchText('  ЁЖ — ТеАтР!  '),'еж театр');
 assert.equal(matchesCandidateText(c,searchWords('  Еж, ГОРЬКОГО ')),true);
 assert.equal(matchesCandidateText(c,searchWords('театр парк')),true);
 assert.equal(matchesCandidateText(c,searchWords('театр кино')),false);
 assert.equal(matchesCandidateText(c,searchWords('')),true);
 assert.throws(()=>searchWords('x'.repeat(121)));
});

test('recommendation reasons require actual interest, known payable budget and exact Moscow time',()=>{
 const c={...candidate,untrusted_title:'Спектакль вечером',starts_at:'2026-10-01T16:00:00.000Z'};
 const result=recommendationFor(c,{...prefs,interests:['Театр'],budgetRub:600,preferredTime:'EVENING'});
 assert.deepEqual(result,{score:7,reasons:['INTEREST','BUDGET','TIME'],interest:'Театр'});
 assert.deepEqual(recommendationFor(c,prefs),{score:0,reasons:[],interest:null});
 assert.deepEqual(recommendationFor(c,{...prefs,interests:['Спорт'],budgetRub:500,preferredTime:'MORNING'}).reasons,[]);
});

test('unknown price and uncertain time never yield budget or time reasons',()=>{
 const c={...candidate,price:{...candidate.price,fees_known:false,total_price:{knownness:'UNKNOWN' as const,basis:'PER_PERSON' as const,currency:null,amount:null}},time_precision:'UNKNOWN' as const};
 assert.deepEqual(recommendationFor(c,{...prefs,budgetRub:1000,preferredTime:'DAY'}).reasons,[]);
});

test('real catalog stays ahead of matching demo; ties have stable observation ordering',()=>{
 const live={...candidate,provenance:{...candidate.provenance,data_mode:'LIVE' as const,observation_id:'b'},untrusted_title:'Другое'};
 const demo={...candidate,provenance:{...candidate.provenance,data_mode:'SYNTHETIC' as const,observation_id:'a'},untrusted_title:'Театр'};
 const ranked=rankRecommendations([demo,live],{...prefs,interests:['Театр']},x=>x);
 assert.deepEqual(ranked.map(x=>x.item.provenance.observation_id),['b','a']);
 const ties=rankRecommendations([live,{...live,provenance:{...live.provenance,observation_id:'a'}}],prefs,x=>x);
 assert.deepEqual(ties.map(x=>x.item.provenance.observation_id),['a','b']);
});
