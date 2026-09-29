import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLaunch} from '../../apps/miniapp/src/core/launch.ts';
import {decodeLaunch,launchParam} from '../../packages/platform/launch.ts';
import {launchLink} from '../../packages/platform/links.ts';
import {botNotice,parseBotUpdate} from '../../packages/platform/bot.ts';
import {obj,strictJson} from '../../packages/platform/wire.ts';

const plan='f4a44a9e-7027-4b56-83e1-22c53c5f5a6b';
const invite='a'.repeat(64),friend='b'.repeat(64),eventRef='c'.repeat(32);
const cfg={mode:'test' as const,publicOrigin:'https://example.invalid',botUsername:'synthetic_bot'};
test('signed launch locators choose the exact V2 surface, with no actor entitlement',()=>{
 const cases:[string,string,string][]=[
  ['catalog','home','CATALOG'],['p_'+plan,'plan:'+plan,'PLAN'],['i_'+invite,'invite','INVITE'],
  ['f_'+friend,'friends','CATALOG'],['x_'+eventRef,'event','CATALOG'],
  [launchParam({kind:'EVENT',sourceId:'SRC',externalEventId:'event',occurrenceId:'occ'}),'event','EVENT']
 ];
 for(const [payload,surface,kind] of cases){const result=resolveLaunch(payload);assert.equal(result.surface,surface);assert.equal(result.route.kind,kind);assert.equal(result.error,undefined);}
 assert.equal(resolveLaunch('f_'+friend).friendToken,friend);
 assert.equal(resolveLaunch('x_'+eventRef).eventRef,eventRef);
});
test('invalid, expired-shape and oversized locators fail closed instead of Home fallback',()=>{
 for(const payload of ['p_'+plan+'x','i_short','f_'+friend+'x','x_'+eventRef+'x','e_!','bad','a'.repeat(513)]){
  assert.deepEqual(decodeLaunch(payload),{kind:'INVALID'});assert.match(resolveLaunch(payload).error??'',/недействительна/);
 }
});
test('MAX links carry compact public startapp payloads and no actor IDs',()=>{
 for(const locator of [{kind:'PLAN' as const,planId:plan},{kind:'INVITE' as const,inviteRef:invite},{kind:'FRIEND' as const,friendRef:friend},{kind:'EVENT_REF' as const,eventRef}]){
  const url=new URL(launchLink(locator,cfg));assert.equal(url.origin,'https://max.ru');assert.equal(url.pathname,'/synthetic_bot');
  const payload=url.searchParams.get('startapp')!;assert.ok(payload.length<=512);assert.match(payload,/^[A-Za-z0-9_-]+$/);assert.deepEqual(decodeLaunch(payload),locator);
  assert.equal(url.searchParams.has('actor'),false);
 }
});
test('factual bot notices serialize documented link button without private plan text',()=>{
 const link=launchLink({kind:'INVITE',inviteRef:invite},cfg);
 const message=botNotice('PLAN_INVITE',link);
 assert.equal(message.attachments[0]?.payload.buttons[0]?.[0]?.type,'link');
 assert.deepEqual(message.attachments[0]?.payload.buttons[0]?.[0],{type:'link',text:'Открыть в Поводе',url:link});
 assert.equal(message.text.includes(invite),false);
 assert.throws(()=>botNotice('PLAN_INVITE','https://example.invalid/?invite='+invite),/BOT_LINK_INVALID/);
});
test('stop and dialog removal retain millisecond source timestamp and actor/chat IDs',()=>{
 for(const kind of ['bot_stopped','dialog_removed']){
  const result=parseBotUpdate(obj(strictJson(JSON.stringify({update_type:kind,timestamp:1800000000123,chat_id:91,user:{user_id:71,first_name:'SYNTHETIC'}}),true)));
  assert.equal(result?.sourceTimestampMs,'1800000000123');assert.deepEqual(result?.revoke,{actorId:'71',chatId:'91'});assert.equal(result?.reply,null);
 }
});
