import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarEventUrl, preferenceWritePayload} from '../../apps/miniapp/src/core/runtime-actions.ts';

test('preferences round trip excludes server-only catalog coverage',()=>{
 const fetched={city:'Москва',interests:['Музыка','Спорт'],budgetRub:null,radiusKm:15,notificationsEnabled:true,preferredTime:'ANY' as const,catalogCoverage:'SUPPORTED',unexpected:'server metadata'};
 assert.deepEqual(preferenceWritePayload(fetched),{city:'Москва',interests:['Музыка','Спорт'],budgetRub:null,radiusKm:15,notificationsEnabled:true,preferredTime:'ANY'});
});

test('calendar event link carries the plan title, time and location',()=>{
 const url=new URL(calendarEventUrl({title:'Поход в музей',startsAt:'2026-10-01T12:00:00.000Z',endsAt:'2026-10-01T13:30:00.000Z',place:'Москва',note:'Встреча у входа'}));
 assert.equal(url.origin,'https://calendar.google.com');
 assert.equal(url.searchParams.get('action'),'TEMPLATE');
 assert.equal(url.searchParams.get('dates'),'20261001T120000Z/20261001T133000Z');
 assert.equal(url.searchParams.get('text'),'Поход в музей');
 assert.equal(url.searchParams.get('location'),'Москва');
 assert.equal(url.searchParams.get('details'),'Встреча у входа');
});

test('calendar event link uses one hour when source has no end time',()=>{
 const url=new URL(calendarEventUrl({title:'Событие',startsAt:'2026-10-01T12:00:00.000Z',endsAt:null,place:null,note:null}));
 assert.equal(url.searchParams.get('dates'),'20261001T120000Z/20261001T130000Z');
});
