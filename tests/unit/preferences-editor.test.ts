import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreferenceEditor,preferenceConflictMessage,type VersionedPreferences} from '../../apps/miniapp/src/core/runtime-actions.ts';
const initial:VersionedPreferences={city:'Москва',interests:[],budgetRub:1000,radiusKm:15,notificationsEnabled:true,preferredTime:'ANY',version:1};
test('K7 client conflict preserves draft and base version, does not retry or signal success; explicit reapply preserves unrelated saved fields',async()=>{
 let saved=initial,writes=0;const editor=createPreferenceEditor('interests',async()=>saved,async()=>{writes++;throw Error('PREFERENCES_VERSION_CONFLICT')});
 await editor.load();editor.edit({...initial,interests:['Кино']});saved={...initial,budgetRub:2000,notificationsEnabled:false,version:2};
 assert.equal(await editor.save(),false);assert.equal(writes,1);assert.equal(editor.getSnapshot().error,preferenceConflictMessage);assert.equal(editor.getSnapshot().conflict,true);assert.deepEqual(editor.getSnapshot().draft,{...initial,interests:['Кино']});
 await editor.load();assert.equal(editor.getSnapshot().draft!.version,1,'background refresh must not replace draft');
 assert.equal(await editor.save(),false);assert.equal(writes,1,'conflict requires explicit reload');
 await editor.reloadSaved();assert.deepEqual(editor.getSnapshot().draft,saved);assert.deepEqual(editor.getSnapshot().preserved!.interests,['Кино']);assert.equal(writes,1);
 editor.reapply();assert.deepEqual(editor.getSnapshot().draft,{...saved,interests:['Кино']});assert.match(editor.getSnapshot().notice,/Сохранить/);assert.equal(writes,1,'reapply never writes automatically');
});
test('K7 client network failure keeps draft, offers retry with the same expectedVersion and differs from conflict',async()=>{
 const payloads:unknown[]=[];const editor=createPreferenceEditor('budgetRub',async()=>initial,async p=>{payloads.push(p);if(payloads.length===1)throw TypeError('Failed to fetch');return {...initial,budgetRub:p.budgetRub,version:2}});
 await editor.load();editor.edit({...initial,budgetRub:3000});assert.equal(await editor.save(),false);assert.equal(editor.getSnapshot().conflict,false);assert.match(editor.getSnapshot().error,/соединение/);assert.equal(editor.getSnapshot().draft!.budgetRub,3000);
 assert.equal(await editor.save(),true);assert.deepEqual(payloads[0],payloads[1]);assert.equal(editor.getSnapshot().draft!.version,2);
});
test('K7 client double submit sends one write and locks edits until completion',async()=>{
 let resolve!:(v:VersionedPreferences)=>void,writes=0;
 const editor=createPreferenceEditor('budgetRub',async()=>initial,()=>{writes++;return new Promise(r=>{resolve=r})});await editor.load();
 const first=editor.save();assert.equal(editor.getSnapshot().pending,true);assert.equal(await editor.save(),false);editor.edit({...initial,budgetRub:5000});assert.equal(editor.getSnapshot().draft!.budgetRub,1000);
 resolve({...initial,version:2});assert.equal(await first,true);assert.equal(writes,1);assert.equal(editor.getSnapshot().pending,false);
});
test('K7 failed reload keeps the conflict draft intact',async()=>{
 let fail=false;const editor=createPreferenceEditor('city',async()=>{if(fail)throw Error('offline');return initial},async()=>{throw Error('PREFERENCES_VERSION_CONFLICT')});
 await editor.load();editor.edit({...initial,city:'Казань'});await editor.save();fail=true;await editor.reloadSaved();assert.equal(editor.getSnapshot().draft!.city,'Казань');assert.equal(editor.getSnapshot().conflict,true);assert.equal(editor.getSnapshot().preserved,null);
});
test('K7 explicit reapply submits the latest version and keeps newer budget/notification settings',async()=>{
 let saved=initial;const writes:unknown[]=[];
 const editor=createPreferenceEditor('interests',async()=>saved,async p=>{writes.push(p);if(p.expectedVersion!==saved.version)throw Error('PREFERENCES_VERSION_CONFLICT');const {expectedVersion,...values}=p;return saved={...values,version:expectedVersion+1}});
 await editor.load();editor.edit({...initial,interests:['Театр']});saved={...initial,budgetRub:2000,notificationsEnabled:false,version:2};
 assert.equal(await editor.save(),false);await editor.reloadSaved();editor.reapply();assert.equal(await editor.save(),true);
 assert.equal(writes.length,2);assert.equal(saved.version,3);assert.equal(saved.budgetRub,2000);assert.equal(saved.notificationsEnabled,false);assert.deepEqual(saved.interests,['Театр']);
});
